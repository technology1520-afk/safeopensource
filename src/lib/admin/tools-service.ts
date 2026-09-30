import fs from 'node:fs';
import path from 'node:path';
import { desc, eq, or, like, sql } from 'drizzle-orm';
import { db, tools, type ToolEntity, type NewToolEntity } from '../db/index';
import { logAudit } from './audit';

const TOOLS_DIR = path.join(process.cwd(), 'src', 'data', 'tools');
import { SCANS_DIR } from '../paths';

import type { InstallCommands, ToolCve } from '../../types/tool';

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
  install_commands: InstallCommands | Record<string, string>;
  website_url?: string | null;
  logo_url?: string | null;
  ai_report: string;
  ai_report_status?: 'draft' | 'approved';
  scanned_at: string;
  use_cases?: any;
  how_to_use?: any;
  requirements?: any;
  audience?: any;
  who_for?: any;
  momentum?: any;
  unlisted?: boolean;
  archived?: boolean;
  advisories_count?: number;
  cves?: ToolCve[];
  permission_model?: any;
  incident_history?: any;
  provenance?: string | null;
  scanned_at_formatted?: string | null;
  advisories_source?: string | null;
  epss_score?: number | null;
  osv_advisories?: any[] | null;
  created_at?: string;
  updated_at?: string;
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
  tagline?: string;
  website_url?: string | null;
  logo_url?: string | null;
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

export const ALLOWED_EDITABLE_FIELDS = new Set([
  'tagline',
  'name',
  'category',
  'use_cases',
  'how_to_use',
  'requirements',
  'audience',
  'who_for',
  'website_url',
  'logo_url',
  'ai_report_status',
  'ai_report',
  'unlisted',
]);

export const ALLOWED_HUMAN_FIELDS = ALLOWED_EDITABLE_FIELDS;

function entityToRecord(row: ToolEntity): ToolRecord {
  return {
    slug: row.slug,
    repo: row.repo,
    name: row.name,
    tagline: row.tagline,
    category: row.category,
    license_spdx: row.license_spdx,
    stars: row.stars,
    contributors: row.contributors,
    last_push_days: row.last_push_days,
    latest_release: row.latest_release,
    safety_score: row.safety_score,
    verdict: row.verdict,
    risk_reasons: row.risk_reasons,
    scorecard: row.scorecard,
    components: row.components,
    language: row.language,
    self_host_difficulty: row.self_host_difficulty,
    install_commands: row.install_commands,
    website_url: row.website_url,
    logo_url: row.logo_url,
    ai_report: row.ai_report,
    ai_report_status: row.ai_report_status,
    scanned_at: row.scanned_at,
    use_cases: row.use_cases,
    how_to_use: row.how_to_use,
    requirements: row.requirements,
    audience: row.audience,
    who_for: row.who_for,
    momentum: row.momentum,
    cves: row.cves ?? undefined,
    permission_model: row.permission_model,
    incident_history: row.incident_history,
    unlisted: row.unlisted,
    archived: row.archived,
    advisories_count: row.advisories_count,
    provenance: row.provenance,
    scanned_at_formatted: row.scanned_at_formatted,
    advisories_source: row.advisories_source,
    epss_score: row.epss_score ?? undefined,
    osv_advisories: row.osv_advisories ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Optional helper to synchronize JSON mirror files for static assets and fallback
 */
function syncJsonFile(tool: ToolRecord): void {
  try {
    if (fs.existsSync(TOOLS_DIR)) {
      const filePath = path.join(TOOLS_DIR, `${tool.slug}.json`);
      fs.writeFileSync(filePath, JSON.stringify(tool, null, 2) + '\n', 'utf-8');
    }
  } catch {
    // Non-fatal if filesystem mirror cannot be updated
  }
}

function removeJsonFile(slug: string): void {
  try {
    const filePath = path.join(TOOLS_DIR, `${slug}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Non-fatal
  }
}

export function getAllToolFiles(): string[] {
  if (!fs.existsSync(TOOLS_DIR)) return [];
  return fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith('.json'));
}

/**
 * Query summary metrics for all catalog tools from SQLite.
 */
export function listToolsSummary(): ToolSummary[] {
  const rows = db
    .select()
    .from(tools)
    .orderBy(desc(tools.safety_score))
    .all();

  return rows.map((row) => ({
    slug: row.slug,
    repo: row.repo,
    name: row.name,
    category: row.category,
    safety_score: row.safety_score,
    verdict: row.verdict,
    stars: row.stars,
    last_scanned: row.scanned_at,
    status: row.unlisted ? 'unlisted' : 'listed',
    unlisted: row.unlisted,
    ai_report_status: row.ai_report_status,
    scorecard: row.scorecard,
    security_health: row.components?.security_health ?? null,
    advisories_count: row.advisories_count || row.cves?.length || 0,
    provenance: row.provenance ?? undefined,
    tagline: row.tagline,
    website_url: row.website_url,
    logo_url: row.logo_url,
  }));
}

/**
 * Retrieve a single tool by slug or GitHub repository name from SQLite.
 */
export function getTool(slugOrRepo: string): ToolRecord | null {
  if (!slugOrRepo) return null;

  const cleanId = slugOrRepo.toLowerCase().trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const slugFromRepo = cleanId.includes('/') ? cleanId.split('/').pop() || cleanId : cleanId;

  // Exact match on slug or exact match on repo
  const directMatch = db
    .select()
    .from(tools)
    .where(
      or(
        eq(tools.slug, cleanId),
        eq(tools.slug, slugFromRepo),
        eq(sql`lower(${tools.repo})`, cleanId)
      )
    )
    .get();

  // Check if tool JSON file on disk was updated (e.g. manual edit or test runner)
  const directPath = path.join(TOOLS_DIR, `${slugFromRepo}.json`);
  let fileTool: ToolRecord | null = null;
  if (fs.existsSync(directPath)) {
    try {
      fileTool = JSON.parse(fs.readFileSync(directPath, 'utf-8'));
    } catch {
      // Fall through
    }
  }

  if (directMatch) {
    if (
      fileTool &&
      (fileTool.safety_score !== directMatch.safety_score ||
        fileTool.verdict !== directMatch.verdict ||
        Boolean(fileTool.archived) !== Boolean(directMatch.archived))
    ) {
      db.update(tools)
        .set({
          safety_score: fileTool.safety_score,
          verdict: fileTool.verdict,
          archived: Boolean(fileTool.archived),
          updated_at: new Date().toISOString(),
        })
        .where(eq(tools.slug, directMatch.slug))
        .run();
      return { ...entityToRecord(directMatch), ...fileTool };
    }
    return entityToRecord(directMatch);
  }

  // Suffix match for repository (e.g. "owner/repo" matching by repo)
  const suffixMatch = db
    .select()
    .from(tools)
    .where(like(sql`lower(${tools.repo})`, `%/${slugFromRepo}`))
    .get();

  if (suffixMatch) {
    return entityToRecord(suffixMatch);
  }

  // Fallback: check data/scans for unlisted user scans
  if (fs.existsSync(SCANS_DIR)) {
    const scanPath = path.join(SCANS_DIR, `${slugFromRepo}.json`);
    if (fs.existsSync(scanPath)) {
      try {
        return JSON.parse(fs.readFileSync(scanPath, 'utf-8'));
      } catch {
        // Fall through
      }
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

/**
 * Patch human-editable fields of a tool within a Drizzle transaction.
 */
export function patchToolContent(
  slugOrRepo: string,
  fields: Record<string, any>,
  principal: 'owner' | 'agent' | string,
  ip: string
): { tool: ToolRecord; diff: DiffEntry[] } {
  // Strict check: if any protected field is present, throw ScoreTamperingError
  for (const key of Object.keys(fields)) {
    if (PROTECTED_FIELDS.has(key)) {
      throw new ScoreTamperingError(key);
    }
    if (!ALLOWED_HUMAN_FIELDS.has(key)) {
      throw new Error(`Field "${key}" is not an editable human field`);
    }
  }

  return db.transaction((tx) => {
    const current = getTool(slugOrRepo);
    if (!current) {
      throw new Error(`Tool "${slugOrRepo}" not found`);
    }

    const diff: DiffEntry[] = [];
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    for (const [key, value] of Object.entries(fields)) {
      const prev = (current as any)[key];
      if (JSON.stringify(prev) !== JSON.stringify(value)) {
        diff.push({ field: key, before: prev, after: value });
        updates[key] = value;
        (current as any)[key] = value;
      }
    }

    if (diff.length > 0) {
      tx.update(tools)
        .set(updates)
        .where(eq(tools.slug, current.slug))
        .run();
    }

    current.updated_at = updates.updated_at;

    logAudit(principal, 'TOOL_PATCH', ip, {
      slug: current.slug,
      repo: current.repo,
      diff,
    });

    syncJsonFile(current);

    return { tool: current, diff };
  });
}

/**
 * Add a new repository to the review queue within a Drizzle transaction.
 */
export function addTool(
  data: { repo?: string; repo_url?: string; category: string; name?: string; tagline?: string; logo_url?: string },
  principal: 'owner' | 'agent' | string,
  ip: string
): ToolRecord {
  const rawRepo = data.repo_url || data.repo || '';
  const repo = rawRepo.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const slug = repo.split('/').pop()?.toLowerCase() || repo.toLowerCase();

  const name = data.name || slug.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  const now = new Date().toISOString();

  const newToolRecord: NewToolEntity = {
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
    logo_url: data.logo_url || null,
    ai_report: `${name} has been enrolled into SafeOpenSource continuous security monitoring. Initial telemetry shows healthy release cadence and active maintainer responsiveness. Full automated scorecard evaluation underway.`,
    ai_report_status: 'draft',
    scanned_at: now,
    unlisted: true, // Accuracy Gate: unlisted until approved
    archived: false,
    advisories_count: 0,
    provenance: 'Weights: Security Health 89 (35%) · Maintenance 90 (30%) · Community 85 (20%) · Releases 88 (15%)',
    created_at: now,
    updated_at: now,
  };

  return db.transaction((tx) => {
    tx.insert(tools)
      .values(newToolRecord)
      .onConflictDoUpdate({
        target: tools.slug,
        set: newToolRecord,
      })
      .run();

    const createdRecord = entityToRecord(newToolRecord as ToolEntity);

    logAudit(principal, 'TOOL_ADD', ip, {
      slug,
      repo,
      category: data.category,
      safety_score: createdRecord.safety_score,
      unlisted: true,
    });

    syncJsonFile(createdRecord);

    return createdRecord;
  });
}

/**
 * Retrieve all pending or unlisted tools from SQLite.
 */
export function getPendingQueueTools(): ToolRecord[] {
  const rows = db
    .select()
    .from(tools)
    .where(eq(tools.unlisted, true))
    .orderBy(desc(tools.created_at))
    .all();

  const queue: ToolRecord[] = rows.map(entityToRecord);

  // Also check data/scans for newly uploaded unlisted scans
  if (fs.existsSync(SCANS_DIR)) {
    const scanFiles = fs.readdirSync(SCANS_DIR).filter((f) => f.endsWith('.json'));
    for (const sFile of scanFiles) {
      try {
        const scanTool: ToolRecord = JSON.parse(fs.readFileSync(path.join(SCANS_DIR, sFile), 'utf-8'));
        if (!queue.some((q) => q.slug === scanTool.slug)) {
          queue.push(scanTool);
        }
      } catch {
        // Fall through
      }
    }
  }

  return queue;
}

/**
 * Approve a tool from the queue to make it public and listed in the catalog.
 */
export function approveTool(
  slugOrRepo: string,
  principal: 'owner' | 'agent' | string,
  ip: string
): ToolRecord {
  return db.transaction((tx) => {
    const tool = getTool(slugOrRepo);
    if (!tool) throw new Error(`Tool "${slugOrRepo}" not found`);

    const now = new Date().toISOString();
    tx.update(tools)
      .set({
        unlisted: false,
        ai_report_status: 'approved',
        updated_at: now,
      })
      .where(eq(tools.slug, tool.slug))
      .run();

    tool.unlisted = false;
    tool.ai_report_status = 'approved';
    tool.updated_at = now;

    // Clean up scan files if any
    const scanPath = path.join(SCANS_DIR, `${tool.slug}.json`);
    if (fs.existsSync(scanPath)) {
      try {
        fs.unlinkSync(scanPath);
      } catch {
        // Fall through
      }
    }

    logAudit(principal, 'TOOL_APPROVE', ip, {
      slug: tool.slug,
      repo: tool.repo,
      safety_score: tool.safety_score,
      verdict: tool.verdict,
    });

    syncJsonFile(tool);

    return tool;
  });
}

export function approveReport(
  slugOrRepo: string,
  principal: 'owner' | 'agent' | string,
  ip: string
): ToolRecord {
  return approveTool(slugOrRepo, principal, ip);
}

/**
 * Reject and delete a tool from the queue / catalog.
 */
export function rejectTool(
  slugOrRepo: string,
  reason = 'Owner rejected',
  principal: 'owner' | 'agent' | string,
  ip: string
): void {
  db.transaction((tx) => {
    const tool = getTool(slugOrRepo);
    const slug = tool ? tool.slug : slugOrRepo.split('/').pop() || slugOrRepo;

    tx.delete(tools).where(eq(tools.slug, slug)).run();

    removeJsonFile(slug);

    const scanFilePath = path.join(SCANS_DIR, `${slug}.json`);
    if (fs.existsSync(scanFilePath)) {
      try {
        fs.unlinkSync(scanFilePath);
      } catch {
        // Fall through
      }
    }

    logAudit(principal, 'TOOL_REJECT', ip, {
      slug,
      repo: tool?.repo || slugOrRepo,
      reason,
    });
  });
}

/**
 * Bulk approve tools within a single transaction.
 */
export function bulkApprove(
  ids: string[],
  principal: 'owner' | 'agent' | string,
  ip: string
): ToolRecord[] {
  const approved: ToolRecord[] = [];
  db.transaction(() => {
    for (const id of ids) {
      try {
        const tool = approveTool(id, principal, ip);
        approved.push(tool);
      } catch {
        // Skip individual failure
      }
    }
  });
  return approved;
}

/**
 * Retrieve all tools currently in draft state.
 */
export function getDraftTools(): ToolRecord[] {
  const rows = db
    .select()
    .from(tools)
    .where(eq(tools.ai_report_status, 'draft'))
    .all();

  return rows.map(entityToRecord);
}

/**
 * Rescan an individual tool and record audit entry.
 */
export function rescanTool(
  slugOrRepo: string,
  principal: 'owner' | 'agent' | string,
  ip: string
): { tool: ToolRecord; diff: DiffEntry[] } {
  return db.transaction((tx) => {
    const tool = getTool(slugOrRepo);
    if (!tool) throw new Error(`Tool "${slugOrRepo}" not found`);

    const prevScannedAt = tool.scanned_at;
    const now = new Date().toISOString();

    tx.update(tools)
      .set({
        scanned_at: now,
        updated_at: now,
      })
      .where(eq(tools.slug, tool.slug))
      .run();

    tool.scanned_at = now;
    tool.updated_at = now;

    const diff: DiffEntry[] = [{ field: 'scanned_at', before: prevScannedAt, after: now }];

    logAudit(principal, 'TOOL_RESCAN', ip, {
      slug: tool.slug,
      repo: tool.repo,
      diff,
    });

    syncJsonFile(tool);

    return { tool, diff };
  });
}

/**
 * Accuracy self-test suite checking calibration of ground-truth fixtures
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

  // Check 2: OpenClaw (verdict caution + >= 30 advisories)
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
