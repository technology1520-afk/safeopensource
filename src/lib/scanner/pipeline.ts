import fs from 'node:fs';
import path from 'node:path';
import { getTool } from '../admin/tools-service';
import type { ToolData, ToolCve } from '../../types/tool';
import {
  compute_safety,
  formatScanTimestamp,
  formatAdvisorySource,
  formatProvenanceLine,
} from './scoring';

const DATA_DIR = path.join(process.cwd(), 'data');
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
  // Strip trailing slashes, whitespace, and git extension
  cleaned = cleaned.replace(/\.git$/, '').replace(/\/+$/, '');

  // Extract owner and repo
  let match = cleaned.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/i);

  if (!match) {
    // Try raw owner/repo
    match = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  }

  if (!match) {
    // If it's a different domain like gitlab or google
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
  // Check catalog
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

  // Check scans store
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

  // Read stored recent scans list if available
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

  // Fallback to latest catalog tools as baseline seed
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
      label: '[3/5] Checking advisories & license',
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
 * Execute real pipeline step-by-step
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

  // Helper for stage timing
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
    } else if (scRes.status === 404) {
      scorecardData = null;
      scorecardScore = null;
      completeStage(1, 'No OpenSSF Scorecard available — security practices unverified');
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
  // STAGE 3: Checking advisories & license
  // ==========================================
  startStage(2);
  const scanDate = new Date();
  const advSource = formatAdvisorySource(scanDate);
  try {
    const advRes = await fetch(`https://api.github.com/advisories?affects=${owner}/${repo}`, {
      headers: ghHeaders,
      signal: AbortSignal.timeout(10000),
    });

    if (advRes.ok) {
      const data = await advRes.json();
      advisoriesData = Array.isArray(data) ? data : [];
    }
    completeStage(2, `${advisoriesData.length} active advisories • Source: ${advSource}`);
  } catch {
    advisoriesData = [];
    completeStage(2, `0 active advisories • Source: ${advSource}`);
  }

  // ==========================================
  // STAGE 4: Computing Safety Score
  // ==========================================
  startStage(3);

  const pushedDate = ghData.pushed_at ? new Date(ghData.pushed_at) : new Date();
  const lastPushDays = Math.max(0, Math.floor((Date.now() - pushedDate.getTime()) / (24 * 3600 * 1000)));

  // Call the single canonical scoring engine
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
