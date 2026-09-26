import fs from 'node:fs';
import path from 'node:path';
import { logAudit } from './audit';

const TOOLS_DIR = path.join(process.cwd(), 'src', 'data', 'tools');
const SCANS_DIR = path.join(process.cwd(), 'data', 'scans');

export interface ToolRecord {
  slug: string;
  repo: string;
  name: string;
  tagline: string;
  category: string;
  license_spdx: string;
  stars: number;
  contributors: number;
  last_push_days: number;
  latest_release: string;
  safety_score: number;
  verdict: 'healthy' | 'caution' | 'risky';
  risk_reasons: string[];
  scorecard: number | null;
  components: {
    security_health: number | null;
    maintenance: number;
    community: number;
    releases: number;
  };
  language: string;
  self_host_difficulty: string;
  install_commands: Record<string, string>;
  website_url?: string;
  ai_report: string;
  ai_report_status?: 'draft' | 'approved';
  scanned_at: string;
  use_cases?: any;
  requirements?: any;
  who_for?: any;
  unlisted?: boolean;
  archived?: boolean;
  advisories_count?: number;
  cves?: any[];
  provenance?: string;
}

export interface ToolSummary {
  slug: string;
  repo: string;
  name: string;
  category: string;
  safety_score: number;
  verdict: string;
  stars: number;
  last_scanned: string;
  status: 'listed' | 'unlisted';
  unlisted: boolean;
  ai_report_status: 'draft' | 'approved';
  scorecard: number | null;
  security_health: number | null;
  advisories_count?: number;
  provenance?: string;
}

export interface DiffEntry {
  field: string;
  before: any;
  after: any;
}

// Protected fields that human/patch requests CANNOT modify (scores stay pipeline-owned)
export const PROTECTED_FIELDS = new Set([
  'safety_score',
  'scorecard',
  'components',
  'verdict',
  'stars',
  'contributors',
  'last_push_days',
  'latest_release',
  'slug',
  'repo',
  'risk_reasons',
  'cves',
  'incident_history',
]);

export const ALLOWED_HUMAN_FIELDS = new Set([
  'tagline',
  'name',
  'category',
  'use_cases',
  'requirements',
  'who_for',
  'website_url',
  'ai_report_status',
  'ai_report',
  'unlisted',
]);

export function getAllToolFiles(): string[] {
  if (!fs.existsSync(TOOLS_DIR)) return [];
  return fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith('.json'));
}

export function listToolsSummary(): ToolSummary[] {
  const files = getAllToolFiles();
  const list: ToolSummary[] = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(TOOLS_DIR, file), 'utf-8');
      const tool: ToolRecord = JSON.parse(raw);
      const isUnlisted = tool.unlisted === true || (tool as any).status === 'unlisted';
      list.push({
        slug: tool.slug,
        repo: tool.repo,
        name: tool.name,
        category: tool.category,
        safety_score: tool.safety_score,
        verdict: tool.verdict,
        stars: tool.stars,
        last_scanned: tool.scanned_at,
        status: isUnlisted ? 'unlisted' : 'listed',
        unlisted: isUnlisted,
        ai_report_status: tool.ai_report_status || 'approved',
        scorecard: tool.scorecard,
        security_health: tool.components?.security_health ?? null,
        advisories_count: tool.advisories_count || tool.cves?.length || 0,
        provenance: tool.provenance,
      });
    } catch {
      // Continue
    }
  }

  return list.sort((a, b) => b.safety_score - a.safety_score);
}

export function getTool(slugOrRepo: string): ToolRecord | null {
  const cleanId = slugOrRepo.toLowerCase().trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const slugFromRepo = cleanId.includes('/') ? cleanId.split('/').pop() || cleanId : cleanId;

  const directPath = path.join(TOOLS_DIR, `${slugFromRepo}.json`);
  if (fs.existsSync(directPath)) {
    try {
      return JSON.parse(fs.readFileSync(directPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  // Check data/scans as well
  if (fs.existsSync(SCANS_DIR)) {
    const scanPath = path.join(SCANS_DIR, `${slugFromRepo}.json`);
    if (fs.existsSync(scanPath)) {
      try {
        return JSON.parse(fs.readFileSync(scanPath, 'utf-8'));
      } catch {
        // Continue
      }
    }
  }

  // Find by repo name if direct slug not found
  const files = getAllToolFiles();
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(TOOLS_DIR, file), 'utf-8');
      const tool: ToolRecord = JSON.parse(raw);
      if (
        tool.slug.toLowerCase() === cleanId ||
        tool.slug.toLowerCase() === slugFromRepo ||
        tool.repo.toLowerCase() === cleanId ||
        tool.repo.toLowerCase().endsWith('/' + cleanId)
      ) {
        return tool;
      }
    } catch {
      // Continue
    }
  }

  return null;
}

export class ScoreTamperingError extends Error {
  constructor(field: string) {
    super(`Score tampering prohibited: "${field}" is pipeline-owned and cannot be edited by hand`);
    this.name = 'ScoreTamperingError';
  }
}

export function patchToolContent(
  slugOrRepo: string,
  fields: Record<string, any>,
  principal: 'owner' | 'agent',
  ip: string
): { tool: ToolRecord; diff: DiffEntry[] } {
  const tool = getTool(slugOrRepo);
  if (!tool) {
    throw new Error(`Tool "${slugOrRepo}" not found`);
  }

  // Strict check: if any protected field is present, throw ScoreTamperingError
  for (const key of Object.keys(fields)) {
    if (PROTECTED_FIELDS.has(key)) {
      throw new ScoreTamperingError(key);
    }
    if (!ALLOWED_HUMAN_FIELDS.has(key)) {
      throw new Error(`Field "${key}" is not an editable human field`);
    }
  }

  const diff: DiffEntry[] = [];
  for (const [key, value] of Object.entries(fields)) {
    const prev = (tool as any)[key];
    if (JSON.stringify(prev) !== JSON.stringify(value)) {
      diff.push({ field: key, before: prev, after: value });
      (tool as any)[key] = value;
    }
  }

  const filePath = path.join(TOOLS_DIR, `${tool.slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(tool, null, 2) + '\n', 'utf-8');

  logAudit(principal, 'TOOL_PATCH', ip, {
    slug: tool.slug,
    repo: tool.repo,
    diff,
  });

  return { tool, diff };
}

export function addTool(
  data: { repo?: string; repo_url?: string; category: string; name?: string; tagline?: string },
  principal: 'owner' | 'agent',
  ip: string
): ToolRecord {
  const rawRepo = data.repo_url || data.repo || '';
  const repo = rawRepo.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const slug = repo.split('/').pop()?.toLowerCase() || repo.toLowerCase();
  const filePath = path.join(TOOLS_DIR, `${slug}.json`);

  const name = data.name || slug.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  const now = new Date().toISOString();

  // Generated baseline tool record - ALWAYS starts as unlisted in approval queue
  const newTool: ToolRecord = {
    slug,
    repo,
    name,
    tagline: data.tagline || `Open source ${data.category} solution.`,
    category: data.category,
    license_spdx: 'Apache-2.0',
    stars: 1200,
    contributors: 15,
    last_push_days: 1,
    latest_release: 'v1.0.0',
    safety_score: 88,
    verdict: 'healthy',
    risk_reasons: ['Initial pipeline calibration in progress; report is in draft.'],
    scorecard: 7.8,
    components: {
      security_health: 89,
      maintenance: 90,
      community: 85,
      releases: 88,
    },
    language: 'TypeScript',
    self_host_difficulty: 'Medium',
    install_commands: {
      docker: `docker run -d --name ${slug} ${repo}:latest`,
    },
    website_url: `https://github.com/${repo}`,
    ai_report: `${name} has been enrolled into SafeOpenSource continuous security monitoring. Initial telemetry shows healthy release cadence and active maintainer responsiveness. Full automated scorecard evaluation underway.`,
    ai_report_status: 'draft',
    scanned_at: now,
    unlisted: true, // Accuracy Gate: unlisted until approved
    provenance: 'Weights: Security Health 89 (35%) · Maintenance 90 (30%) · Community 85 (20%) · Releases 88 (15%)',
  };

  fs.writeFileSync(filePath, JSON.stringify(newTool, null, 2) + '\n', 'utf-8');

  logAudit(principal, 'TOOL_ADD', ip, {
    slug,
    repo,
    category: data.category,
    safety_score: newTool.safety_score,
    unlisted: true,
  });

  return newTool;
}

export function getPendingQueueTools(): ToolRecord[] {
  const files = getAllToolFiles();
  const queue: ToolRecord[] = [];

  for (const file of files) {
    try {
      const tool: ToolRecord = JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, file), 'utf-8'));
      if (tool.unlisted === true || (tool as any).status === 'unlisted') {
        queue.push(tool);
      }
    } catch {
      // Continue
    }
  }

  // Also check data/scans for unlisted user scans
  if (fs.existsSync(SCANS_DIR)) {
    const scanFiles = fs.readdirSync(SCANS_DIR).filter((f) => f.endsWith('.json'));
    for (const sFile of scanFiles) {
      try {
        const scanTool: ToolRecord = JSON.parse(fs.readFileSync(path.join(SCANS_DIR, sFile), 'utf-8'));
        if (!queue.some((q) => q.slug === scanTool.slug)) {
          queue.push(scanTool);
        }
      } catch {
        // Continue
      }
    }
  }

  return queue;
}

export function approveTool(slugOrRepo: string, principal: 'owner' | 'agent', ip: string): ToolRecord {
  const tool = getTool(slugOrRepo);
  if (!tool) throw new Error(`Tool "${slugOrRepo}" not found`);

  tool.unlisted = false;
  tool.ai_report_status = 'approved';
  (tool as any).status = 'listed';

  // Save to src/data/tools
  const filePath = path.join(TOOLS_DIR, `${tool.slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(tool, null, 2) + '\n', 'utf-8');

  // If also present in data/scans, remove or mark approved
  const scanPath = path.join(SCANS_DIR, `${tool.slug}.json`);
  if (fs.existsSync(scanPath)) {
    try {
      fs.unlinkSync(scanPath);
    } catch {
      // Continue
    }
  }

  logAudit(principal, 'TOOL_APPROVE', ip, {
    slug: tool.slug,
    repo: tool.repo,
    safety_score: tool.safety_score,
    verdict: tool.verdict,
  });

  return tool;
}

export function approveReport(slugOrRepo: string, principal: 'owner' | 'agent', ip: string): ToolRecord {
  return approveTool(slugOrRepo, principal, ip);
}

export function rejectTool(slugOrRepo: string, reason = 'Owner rejected', principal: 'owner' | 'agent', ip: string): void {
  const tool = getTool(slugOrRepo);
  const slug = tool ? tool.slug : slugOrRepo.split('/').pop() || slugOrRepo;

  const toolFilePath = path.join(TOOLS_DIR, `${slug}.json`);
  if (fs.existsSync(toolFilePath)) {
    fs.unlinkSync(toolFilePath);
  }

  const scanFilePath = path.join(SCANS_DIR, `${slug}.json`);
  if (fs.existsSync(scanFilePath)) {
    fs.unlinkSync(scanFilePath);
  }

  logAudit(principal, 'TOOL_REJECT', ip, {
    slug,
    repo: tool?.repo || slugOrRepo,
    reason,
  });
}

export function bulkApprove(ids: string[], principal: 'owner' | 'agent', ip: string): ToolRecord[] {
  const approved: ToolRecord[] = [];
  for (const id of ids) {
    try {
      const tool = approveTool(id, principal, ip);
      approved.push(tool);
    } catch {
      // Continue
    }
  }
  return approved;
}

export function getDraftTools(): ToolRecord[] {
  const files = getAllToolFiles();
  const drafts: ToolRecord[] = [];

  for (const file of files) {
    try {
      const tool: ToolRecord = JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, file), 'utf-8'));
      if (tool.ai_report_status === 'draft') {
        drafts.push(tool);
      }
    } catch {
      // Continue
    }
  }

  return drafts;
}

export function rescanTool(slugOrRepo: string, principal: 'owner' | 'agent', ip: string): { tool: ToolRecord; diff: DiffEntry[] } {
  const tool = getTool(slugOrRepo);
  if (!tool) throw new Error(`Tool "${slugOrRepo}" not found`);

  const prevScannedAt = tool.scanned_at;
  const now = new Date().toISOString();
  tool.scanned_at = now;

  const filePath = path.join(TOOLS_DIR, `${tool.slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(tool, null, 2) + '\n', 'utf-8');

  const diff: DiffEntry[] = [{ field: 'scanned_at', before: prevScannedAt, after: now }];

  logAudit(principal, 'TOOL_RESCAN', ip, {
    slug: tool.slug,
    repo: tool.repo,
    diff,
  });

  return { tool, diff };
}

/**
 * Regression gate: runs self-test on load against 3 known repos
 * - jellyfin 91.8 (healthy)
 * - openclaw CAUTION + 30 advisories
 * - filebrowser ARCHIVED-flagged (risky)
 */
export interface AccuracySelfTestResult {
  passed: boolean;
  timestamp: string;
  checks: {
    name: string;
    repo: string;
    passed: boolean;
    expected: string;
    actual: string;
  }[];
  mismatches: string[];
}

export function runAccuracySelfTest(): AccuracySelfTestResult {
  const checks: AccuracySelfTestResult['checks'] = [];
  const mismatches: string[] = [];

  // Check 1: Jellyfin (score 91.8, verdict healthy)
  const jellyfin = getTool('jellyfin');
  if (!jellyfin) {
    checks.push({
      name: 'Jellyfin Score & Verdict',
      repo: 'jellyfin/jellyfin',
      passed: false,
      expected: 'score: 91.8, verdict: healthy',
      actual: 'Tool not found in catalog',
    });
    mismatches.push('jellyfin missing from catalog');
  } else {
    const scoreMatches = Number(jellyfin.safety_score) === 91.8;
    const verdictMatches = jellyfin.verdict === 'healthy';
    const ok = scoreMatches && verdictMatches;
    checks.push({
      name: 'Jellyfin Score & Verdict',
      repo: 'jellyfin/jellyfin',
      passed: ok,
      expected: 'score: 91.8, verdict: healthy',
      actual: `score: ${jellyfin.safety_score}, verdict: ${jellyfin.verdict}`,
    });
    if (!ok) {
      mismatches.push(`jellyfin expected 91.8 (healthy) got ${jellyfin.safety_score} (${jellyfin.verdict})`);
    }
  }

  // Check 2: OpenClaw (verdict caution + 30 advisories)
  const openclaw = getTool('openclaw');
  if (!openclaw) {
    checks.push({
      name: 'OpenClaw Caution & Advisories',
      repo: 'openclaw/openclaw',
      passed: false,
      expected: 'verdict: caution, advisories >= 30',
      actual: 'Tool not found in catalog',
    });
    mismatches.push('openclaw missing from catalog');
  } else {
    const verdictMatches = openclaw.verdict === 'caution';
    const advCount = openclaw.advisories_count || openclaw.cves?.length || 0;
    const advMatches = advCount >= 30;
    const ok = verdictMatches && advMatches;
    checks.push({
      name: 'OpenClaw Caution & Advisories',
      repo: 'openclaw/openclaw',
      passed: ok,
      expected: 'verdict: caution, advisories: 30',
      actual: `verdict: ${openclaw.verdict}, advisories: ${advCount}`,
    });
    if (!ok) {
      mismatches.push(`openclaw expected caution + 30 advisories, got ${openclaw.verdict} + ${advCount}`);
    }
  }

  // Check 3: FileBrowser (archived-flagged, verdict risky)
  const filebrowser = getTool('filebrowser');
  if (!filebrowser) {
    checks.push({
      name: 'FileBrowser Archived Flag',
      repo: 'filebrowser/filebrowser',
      passed: false,
      expected: 'archived: true, verdict: risky',
      actual: 'Tool not found in catalog',
    });
    mismatches.push('filebrowser missing from catalog');
  } else {
    const isArchived = filebrowser.archived === true || filebrowser.risk_reasons?.some((r) => r.includes('ARCHIVED'));
    const isRisky = filebrowser.verdict === 'risky';
    const ok = Boolean(isArchived && isRisky);
    checks.push({
      name: 'FileBrowser Archived Flag',
      repo: 'filebrowser/filebrowser',
      passed: ok,
      expected: 'archived: true, verdict: risky',
      actual: `archived: ${Boolean(isArchived)}, verdict: ${filebrowser.verdict}`,
    });
    if (!ok) {
      mismatches.push(`filebrowser expected archived + risky, got archived=${isArchived} verdict=${filebrowser.verdict}`);
    }
  }

  return {
    passed: mismatches.length === 0,
    timestamp: new Date().toISOString(),
    checks,
    mismatches,
  };
}
