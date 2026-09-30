import fs from 'node:fs';
import path from 'node:path';
import { getTool } from '../admin/tools-service';
import type { ToolData, ToolCve, OsvAdvisory } from '../../types/tool';
import {
  compute_safety,
  formatAdvisorySource,
} from './scoring';

const DATA_DIR = process.env.SOS_DATA_DIR || (process.env.NETLIFY ? '/tmp/sos-data' : path.join(process.cwd(), 'data'));
const SCANS_DIR = path.join(DATA_DIR, 'scans');
const RECENT_SCANS_FILE = path.join(DATA_DIR, 'recent-scans.json');

export interface ScanStage {
  id: number;
  key: 'fetching_metadata' | 'security_checks' | 'advisories_license' | 'computing_score' | 'generating_report';
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: number;
  endedAt?: number;
  durationSeconds?: number;
  message?: string;
  error?: string;
}

export interface ScanJob {
  id: string;
  url: string;
  owner: string;
  repo: string;
  fullRepo: string;
  slug: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
  stages: ScanStage[];
  currentStageIndex: number;
  partialData?: {
    name?: string;
    description?: string;
    stars?: number;
    license?: string;
    language?: string;
  };
  result?: ToolData;
  error?: string;
  failedStage?: number;
  retryable?: boolean;
}

export interface NormalizedRepo {
  owner: string;
  repo: string;
  fullRepo: string;
  slug: string;
}

/**
 * High-performance sliding-window rate limiter for external vulnerability APIs
 */
export class SlidingWindowLimiter {
  private timestamps: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async acquire(): Promise<boolean> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0];
      const waitTime = Math.min(1000, Math.max(50, this.windowMs - (now - oldest)));
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.acquire();
    }
    this.timestamps.push(Date.now());
    return true;
  }
}

// In-memory sliding window rate limiters (OSV: 15 req/2s, EPSS: 10 req/2s)
const osvLimiter = new SlidingWindowLimiter(15, 2000);
const epssLimiter = new SlidingWindowLimiter(10, 2000);

/**
 * Fetch package-level and commit-level vulnerabilities from OSV.dev
 * Querying by git commit hash or release tag across npm, PyPI, crates.io, and Go modules.
 */
export async function fetchOsvVulnerabilities(options: {
  commit?: string;
  tag?: string;
  repo?: string;
  name?: string;
}): Promise<{ osvAdvisories: OsvAdvisory[]; cveIds: string[] }> {
  const osvAdvisories: OsvAdvisory[] = [];
  const cveSet = new Set<string>();

  const processVuln = (v: any) => {
    if (!v || !v.id) return;

    const idUpper = String(v.id).toUpperCase();
    if (idUpper.startsWith('CVE-')) {
      cveSet.add(idUpper);
    }

    if (Array.isArray(v.aliases)) {
      for (const alias of v.aliases) {
        const aliasUpper = String(alias).toUpperCase();
        if (aliasUpper.startsWith('CVE-')) {
          cveSet.add(aliasUpper);
        }
      }
    }

    let severity = 'MODERATE';
    if (v.database_specific?.severity) {
      severity = String(v.database_specific.severity).toUpperCase();
    } else if (Array.isArray(v.severity) && v.severity.length > 0) {
      severity = String(v.severity[0].score || v.severity[0].type || 'MODERATE').toUpperCase();
    }

    let fixedIn: string | undefined = undefined;
    if (Array.isArray(v.affected)) {
      for (const aff of v.affected) {
        if (Array.isArray(aff.ranges)) {
          for (const rng of aff.ranges) {
            if (Array.isArray(rng.events)) {
              for (const ev of rng.events) {
                if (ev.fixed) {
                  fixedIn = String(ev.fixed);
                  break;
                }
              }
            }
          }
        }
      }
    }

    osvAdvisories.push({
      id: v.id,
      summary: v.summary || (v.details ? v.details.slice(0, 140) : 'Vulnerability reported in upstream dependency'),
      severity,
      fixed_in: fixedIn,
    });
  };

  try {
    // 1. Query OSV by commit SHA (if available)
    if (options.commit && /^[0-9a-f]{40}$/i.test(options.commit)) {
      await osvLimiter.acquire();
      const commitRes = await fetch('https://api.osv.dev/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commit: options.commit }),
        signal: AbortSignal.timeout(4000), // Max 4 seconds timeout
      });

      if (commitRes.ok) {
        const data = await commitRes.json();
        if (Array.isArray(data.vulns)) {
          for (const vuln of data.vulns) {
            processVuln(vuln);
          }
        }
      }
    }

    // 2. Query OSV by package across ecosystem registries (npm, PyPI, crates.io, Go)
    const pkgName = options.name || options.repo?.split('/').pop() || '';
    if (pkgName && options.tag) {
      const cleanVer = options.tag.replace(/^v/i, '');
      const ecosystems = ['npm', 'PyPI', 'crates.io', 'Go'];

      for (const ecosystem of ecosystems) {
        if (osvAdvisories.length >= 10) break; // Circuit break if sufficient advisories found

        await osvLimiter.acquire();
        const pkgRes = await fetch('https://api.osv.dev/v1/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            package: { name: pkgName, ecosystem },
            version: cleanVer,
          }),
          signal: AbortSignal.timeout(4000), // Max 4 seconds timeout
        });

        if (pkgRes.ok) {
          const pkgData = await pkgRes.json();
          if (Array.isArray(pkgData.vulns)) {
            for (const vuln of pkgData.vulns) {
              processVuln(vuln);
            }
          }
        }
      }
    }
  } catch {
    // Fallback gracefully on timeout or network degradation
  }

  // Deduplicate advisories by ID
  const uniqueAdvisories: OsvAdvisory[] = [];
  const seenIds = new Set<string>();
  for (const adv of osvAdvisories) {
    if (!seenIds.has(adv.id)) {
      seenIds.add(adv.id);
      uniqueAdvisories.push(adv);
    }
  }

  return {
    osvAdvisories: uniqueAdvisories.slice(0, 15),
    cveIds: Array.from(cveSet),
  };
}

/**
 * Fetch Exploit Prediction Scoring System (EPSS) metrics from the FIRST.org API
 */
export async function fetchEpssScores(cveIds: string[]): Promise<{
  maxEpss: number;
  scoresByCve: Record<string, number>;
}> {
  if (!cveIds || cveIds.length === 0) {
    return { maxEpss: 0, scoresByCve: {} };
  }

  const scoresByCve: Record<string, number> = {};
  let maxEpss = 0;

  // Filter valid CVE format and deduplicate (cap at 25 to respect URL limits)
  const cleanCves = Array.from(new Set(cveIds))
    .filter((id) => /^CVE-\d{4}-\d+/i.test(id))
    .slice(0, 25);

  if (cleanCves.length === 0) {
    return { maxEpss: 0, scoresByCve: {} };
  }

  try {
    await epssLimiter.acquire();
    const url = `https://api.first.org/data/v1/epss?cve=${cleanCves.join(',')}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SafeOpenSource-Scanner/1.0' },
      signal: AbortSignal.timeout(4000), // Max 4 seconds timeout
    });

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) {
        for (const item of json.data) {
          if (item && item.cve && item.epss) {
            const score = parseFloat(item.epss);
            if (!isNaN(score)) {
              scoresByCve[item.cve.toUpperCase()] = score;
              if (score > maxEpss) {
                maxEpss = score;
              }
            }
          }
        }
      }
    }
  } catch {
    // Gracefully handle timeout or API failure without failing scan
  }

  return {
    maxEpss: Number(maxEpss.toFixed(5)),
    scoresByCve,
  };
}

export function ensureScansDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SCANS_DIR)) fs.mkdirSync(SCANS_DIR, { recursive: true });
}

/**
 * Normalizes any GitHub URL variant to { owner, repo, fullRepo, slug }
 */
export function normalizeGitHubUrl(input: string): { normalized?: NormalizedRepo; error?: string } {
  if (!input || typeof input !== 'string') {
    return { error: 'Please provide a repository URL.' };
  }

  let cleaned = input.trim();
  cleaned = cleaned.replace(/\.git$/, '').replace(/\/+$/, '');

  let match = cleaned.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/i);

  if (!match) {
    match = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  }

  if (!match) {
    return {
      error: 'Only public GitHub repositories are supported for now (e.g., github.com/owner/repo).',
    };
  }

  const owner = match[1];
  const repo = match[2];

  if (!owner || !repo) {
    return {
      error: 'Invalid GitHub repository format. Expected github.com/owner/repo.',
    };
  }

  const fullRepo = `${owner}/${repo}`;
  const slug = repo.toLowerCase();

  return {
    normalized: {
      owner,
      repo,
      fullRepo,
      slug,
    },
  };
}

/**
 * Check if the repo was scanned in the last 7 days (catalog or scan store)
 */
export function checkRecentScan(fullRepo: string, slug: string): { tool?: ToolData; daysAgo?: number } {
  const catalogTool = getTool(slug) || getTool(fullRepo);
  if (catalogTool) {
    const scannedAt = catalogTool.scanned_at;
    if (scannedAt) {
      const daysAgo = Math.max(
        0,
        Math.floor((Date.now() - new Date(scannedAt).getTime()) / (24 * 3600 * 1000))
      );
      if (daysAgo < 7) {
        return { tool: catalogTool as ToolData, daysAgo };
      }
    }
  }

  ensureScansDir();
  const scanPath = path.join(SCANS_DIR, `${slug}.json`);
  if (fs.existsSync(scanPath)) {
    try {
      const tool: ToolData = JSON.parse(fs.readFileSync(scanPath, 'utf-8'));
      const scannedAt = tool.scanned_at;
      if (scannedAt) {
        const daysAgo = Math.max(
          0,
          Math.floor((Date.now() - new Date(scannedAt).getTime()) / (24 * 3600 * 1000))
        );
        if (daysAgo < 7) {
          return { tool, daysAgo };
        }
      }
    } catch {
      // Continue
    }
  }

  return {};
}

/**
 * Retrieve recent public scans for social proof strip
 */
export function getRecentPublicScans(limit = 5): ToolData[] {
  ensureScansDir();
  const recent: ToolData[] = [];

  if (fs.existsSync(RECENT_SCANS_FILE)) {
    try {
      const list: ToolData[] = JSON.parse(fs.readFileSync(RECENT_SCANS_FILE, 'utf-8'));
      if (Array.isArray(list) && list.length > 0) {
        return list.slice(0, limit);
      }
    } catch {
      // Continue
    }
  }

  const fallbackSlugs = ['jellyfin', 'vaultwarden', 'uptime-kuma', 'immich', 'home-assistant'];
  for (const s of fallbackSlugs) {
    const t = getTool(s);
    if (t) recent.push(t as ToolData);
  }

  return recent.slice(0, limit);
}

/**
 * Record completed scan to recent-scans list
 */
export function recordRecentScan(tool: ToolData) {
  ensureScansDir();
  let list: ToolData[] = [];
  if (fs.existsSync(RECENT_SCANS_FILE)) {
    try {
      list = JSON.parse(fs.readFileSync(RECENT_SCANS_FILE, 'utf-8'));
    } catch {
      list = [];
    }
  }

  list = [tool, ...list.filter((t) => t.slug !== tool.slug && t.repo !== tool.repo)].slice(0, 10);
  fs.writeFileSync(RECENT_SCANS_FILE, JSON.stringify(list, null, 2) + '\n', 'utf-8');
}

/**
 * Create initial 5-stage scan job
 */
export function createScanJob(normalized: NormalizedRepo, url: string): ScanJob {
  const id = `scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const stages: ScanStage[] = [
    {
      id: 1,
      key: 'fetching_metadata',
      label: '[1/5] Fetching repository metadata',
      status: 'pending',
    },
    {
      id: 2,
      key: 'security_checks',
      label: '[2/5] Running security checks (OpenSSF Scorecard)',
      status: 'pending',
    },
    {
      id: 3,
      key: 'advisories_license',
      label: '[3/5] Ingesting OSV.dev & FIRST.org EPSS metrics',
      status: 'pending',
    },
    {
      id: 4,
      key: 'computing_score',
      label: '[4/5] Computing Safety Score',
      status: 'pending',
    },
    {
      id: 5,
      key: 'generating_report',
      label: '[5/5] Generating plain-language report',
      status: 'pending',
    },
  ];

  const job: ScanJob = {
    id,
    url,
    owner: normalized.owner,
    repo: normalized.repo,
    fullRepo: normalized.fullRepo,
    slug: normalized.slug,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    stages,
    currentStageIndex: 0,
  };

  activeScanJobs.set(id, job);
  return job;
}

const activeScanJobs = new Map<string, ScanJob>();

export function getScanJob(id: string): ScanJob | undefined {
  return activeScanJobs.get(id);
}

export function saveScanJob(job: ScanJob) {
  activeScanJobs.set(job.id, job);
}

/**
 * Execute real pipeline step-by-step with OSV.dev and FIRST.org EPSS ingestion
 */
export async function executeScanPipeline(job: ScanJob, onProgress?: (job: ScanJob) => void): Promise<ToolData> {
  job.status = 'running';
  job.updatedAt = Date.now();
  onProgress?.(job);

  const { owner, repo, fullRepo, slug } = job;
  const token = process.env.GITHUB_TOKEN;
  const ghHeaders: Record<string, string> = {
    'User-Agent': 'SafeOpenSource-Scanner/1.0',
    Accept: 'application/vnd.github.v3+json',
    ...(token ? { Authorization: `token ${token}` } : {}),
  };

  const startStage = (idx: number) => {
    job.currentStageIndex = idx;
    const stage = job.stages[idx];
    stage.status = 'running';
    stage.startedAt = Date.now();
    job.updatedAt = Date.now();
    onProgress?.(job);
  };

  const completeStage = (idx: number, message?: string) => {
    const stage = job.stages[idx];
    stage.status = 'completed';
    stage.endedAt = Date.now();
    stage.durationSeconds = Number(((stage.endedAt - (stage.startedAt || stage.endedAt)) / 1000).toFixed(1));
    stage.message = message;
    job.updatedAt = Date.now();
    onProgress?.(job);
  };

  const failStage = (idx: number, error: string) => {
    const stage = job.stages[idx];
    stage.status = 'failed';
    stage.endedAt = Date.now();
    stage.durationSeconds = Number(((stage.endedAt - (stage.startedAt || stage.endedAt)) / 1000).toFixed(1));
    stage.error = error;
    job.status = 'failed';
    job.error = error;
    job.failedStage = idx + 1;
    job.retryable = true;
    job.updatedAt = Date.now();
    onProgress?.(job);
    throw new Error(error);
  };

  let ghData: any = {};
  let scorecardData: any = {};
  let advisoriesData: any[] = [];
  let latestCommitSha: string | undefined = undefined;

  // ==========================================
  // STAGE 1: Fetching repository metadata
  // ==========================================
  startStage(0);
  try {
    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: ghHeaders,
      signal: AbortSignal.timeout(12000),
    });

    if (ghRes.status === 404) {
      failStage(0, 'Repository not found or private. Only public GitHub repos are supported for now.');
    } else if (ghRes.status === 403 || ghRes.status === 429) {
      const remaining = ghRes.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        failStage(0, 'GitHub API quota momentarily exhausted. Please retry in a few moments.');
      } else {
        failStage(0, 'Access forbidden by upstream GitHub API. Repository may be restricted.');
      }
    } else if (!ghRes.ok) {
      failStage(0, `GitHub API returned HTTP ${ghRes.status}`);
    }

    ghData = await ghRes.json();
    job.partialData = {
      name: ghData.name || repo,
      description: ghData.description || 'Open source project',
      stars: ghData.stargazers_count || 0,
      license: ghData.license?.spdx_id || 'NOASSERTION',
      language: ghData.language || 'Codebase',
    };

    // Attempt to resolve latest commit SHA on default branch for OSV commit queries
    try {
      const branch = ghData.default_branch || 'main';
      const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${branch}`, {
        headers: ghHeaders,
        signal: AbortSignal.timeout(4000),
      });
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        latestCommitSha = commitData.sha;
      }
    } catch {
      // Non-fatal
    }

    completeStage(0, `${job.partialData.stars?.toLocaleString()} stars • ${job.partialData.license}`);
  } catch (err: any) {
    if (job.stages[0].status !== 'failed') {
      failStage(0, err.message || 'Failed to connect to GitHub API');
    }
  }

  // ==========================================
  // STAGE 2: Running security checks (OpenSSF Scorecard)
  // ==========================================
  startStage(1);
  let scorecardScore: number | null = null;
  try {
    const scRes = await fetch(`https://api.securityscorecards.dev/projects/github.com/${owner}/${repo}`, {
      headers: { 'User-Agent': 'SafeOpenSource-Scanner/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (scRes.ok) {
      scorecardData = await scRes.json();
      if (scorecardData && typeof scorecardData.score === 'number') {
        scorecardScore = Number(scorecardData.score.toFixed(1));
        completeStage(1, `Scorecard rating: ${scorecardScore}/10`);
      } else {
        scorecardScore = null;
        completeStage(1, 'No OpenSSF Scorecard available — security practices unverified');
      }
    } else {
      scorecardData = null;
      scorecardScore = null;
      completeStage(1, 'No OpenSSF Scorecard available — security practices unverified');
    }
  } catch (err: any) {
    scorecardData = null;
    scorecardScore = null;
    completeStage(1, 'No OpenSSF Scorecard available — security practices unverified');
  }

  // ==========================================
  // STAGE 3: Ingesting OSV.dev & FIRST.org EPSS metrics
  // ==========================================
  startStage(2);
  const scanDate = new Date();
  const advSource = formatAdvisorySource(scanDate);
  let osvData: OsvAdvisory[] = [];
  let epssScore: number = 0;
  const discoveredCves = new Set<string>();

  // 1. Ingest GitHub Advisories
  try {
    const advRes = await fetch(`https://api.github.com/advisories?affects=${owner}/${repo}`, {
      headers: ghHeaders,
      signal: AbortSignal.timeout(4000),
    });

    if (advRes.ok) {
      const data = await advRes.json();
      advisoriesData = Array.isArray(data) ? data : [];
      for (const adv of advisoriesData) {
        if (adv.cve_id) {
          discoveredCves.add(String(adv.cve_id).toUpperCase());
        }
      }
    }
  } catch {
    advisoriesData = [];
  }

  // 2. Ingest OSV.dev package & commit vulnerabilities
  try {
    const osvRes = await fetchOsvVulnerabilities({
      commit: latestCommitSha,
      tag: ghData.default_branch || 'v1.0.0',
      repo: fullRepo,
      name: ghData.name || repo,
    });
    osvData = osvRes.osvAdvisories;
    for (const cve of osvRes.cveIds) {
      discoveredCves.add(cve.toUpperCase());
    }
  } catch {
    osvData = [];
  }

  // 3. Query Exploit Prediction Scoring System (EPSS) for all discovered CVEs
  try {
    if (discoveredCves.size > 0) {
      const epssRes = await fetchEpssScores(Array.from(discoveredCves));
      epssScore = epssRes.maxEpss;
    }
  } catch {
    epssScore = 0;
  }

  const epssDisplay = epssScore > 0 ? ` • Peak EPSS: ${(epssScore * 100).toFixed(1)}%` : '';
  completeStage(2, `${advisoriesData.length} GHSA • ${osvData.length} OSV${epssDisplay} • Source: ${advSource}`);

  // ==========================================
  // STAGE 4: Computing Safety Score
  // ==========================================
  startStage(3);

  const pushedDate = ghData.pushed_at ? new Date(ghData.pushed_at) : new Date();
  const lastPushDays = Math.max(0, Math.floor((Date.now() - pushedDate.getTime()) / (24 * 3600 * 1000)));

  // Call the single canonical scoring engine with integrated EPSS & OSV parameters
  const scoringResult = compute_safety({
    repo: fullRepo,
    slug,
    scorecardScore,
    stars: ghData.stargazers_count,
    lastPushDays,
    archived: Boolean(ghData.archived),
    hasWiki: Boolean(ghData.has_wiki),
    hasIssues: Boolean(ghData.has_issues),
    advisoriesCount: advisoriesData.length,
    osvAdvisoriesCount: osvData.length,
    epssScore,
    date: scanDate,
  });

  const {
    safety_score: safetyScore,
    verdict,
    components,
    provenance,
    risk_reasons: riskReasons,
    scorecard,
    scanned_at_formatted: scannedAtFormatted,
    advisories_source: advisoriesSourceResult,
  } = scoringResult;

  completeStage(3, `Calculated Safety Score: ${safetyScore}/100 (${verdict.toUpperCase()})`);

  // ==========================================
  // STAGE 5: Generating plain-language report
  // ==========================================
  startStage(4);

  const nowIso = scanDate.toISOString();
  const spdx = ghData.license?.spdx_id || 'NOASSERTION';
  const repoName = ghData.name || repo;
  const description = ghData.description || `Open source software repository monitored by SafeOpenSource.`;
  const catalogMatch = getTool(slug) || getTool(fullRepo);

  const scorecardDesc = scorecard !== null ? `OpenSSF Scorecard metrics (${scorecard}/10)` : 'unverified OpenSSF telemetry';

  const reportText = catalogMatch?.ai_report ||
    `${repoName} (${fullRepo}) has been evaluated by the SafeOpenSource continuous telemetry pipeline. The project achieves an overall Safety Score of ${safetyScore}/100 with a ${verdict.toUpperCase()} posture based on ${scorecardDesc} and GitHub commit momentum (${lastPushDays}d since last push). Maintainers provide public source availability under ${spdx}.`;

  const cves: ToolCve[] = advisoriesData.slice(0, 5).map((adv: any) => ({
    id: adv.ghsa_id || adv.cve_id || 'GHSA-ADVISORY',
    summary: adv.summary || 'Security advisory reported upstream',
    severity: adv.severity || 'high',
    fix_status: 'mitigated',
    published_at: adv.published_at || nowIso,
    url: adv.html_url,
  }));

  const toolRecord: ToolData = {
    slug,
    repo: fullRepo,
    name: repoName,
    tagline: description,
    category: catalogMatch?.category || 'developer-tools',
    license_spdx: spdx,
    stars: ghData.stargazers_count || 100,
    contributors: ghData.subscribers_count || 10,
    last_push_days: lastPushDays,
    latest_release: ghData.default_branch || 'main',
    safety_score: safetyScore,
    verdict,
    risk_reasons: riskReasons,
    scorecard,
    components,
    provenance,
    scanned_at_formatted: scannedAtFormatted,
    advisories_source: advisoriesSourceResult,
    archived: Boolean(ghData.archived),
    language: ghData.language || 'Software',
    self_host_difficulty: 'Medium',
    install_commands: {
      clone: `git clone https://github.com/${fullRepo}.git`,
    },
    website_url: ghData.homepage || `https://github.com/${fullRepo}`,
    ai_report: reportText,
    ai_report_status: 'draft',
    scanned_at: nowIso,
    cves: cves.length > 0 ? cves : undefined,
    unlisted: true,
    epss_score: epssScore,
    osv_advisories: osvData.length > 0 ? osvData : undefined,
  };

  // Persist to data/scans
  ensureScansDir();
  fs.writeFileSync(path.join(SCANS_DIR, `${slug}.json`), JSON.stringify(toolRecord, null, 2) + '\n', 'utf-8');
  recordRecentScan(toolRecord);

  completeStage(4, 'Report generated & cataloged (unlisted)');
  job.status = 'completed';
  job.result = toolRecord;
  job.updatedAt = Date.now();
  onProgress?.(job);

  return toolRecord;
}
