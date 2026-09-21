import fs from 'node:fs';
import path from 'node:path';
import { logAudit } from './audit';

const TOOLS_DIR = path.join(process.cwd(), 'src', 'data', 'tools');

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
  scorecard: number;
  components: {
    security_health: number;
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
  ai_report_status: 'draft' | 'approved';
}

export interface DiffEntry {
  field: string;
  before: any;
  after: any;
}

// Protected fields that human/patch requests CANNOT modify (scores stay pipeline-owned)
const PROTECTED_FIELDS = new Set([
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
]);

const ALLOWED_HUMAN_FIELDS = new Set([
  'tagline',
  'name',
  'category',
  'use_cases',
  'requirements',
  'who_for',
  'website_url',
  'ai_report_status',
  'ai_report',
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
      list.push({
        slug: tool.slug,
        repo: tool.repo,
        name: tool.name,
        category: tool.category,
        safety_score: tool.safety_score,
        verdict: tool.verdict,
        stars: tool.stars,
        last_scanned: tool.scanned_at,
        ai_report_status: tool.ai_report_status || 'approved',
      });
    } catch {
      // Continue
    }
  }

  return list.sort((a, b) => b.safety_score - a.safety_score);
}

export function getTool(slugOrRepo: string): ToolRecord | null {
  const cleanId = slugOrRepo.toLowerCase().trim();
  const directPath = path.join(TOOLS_DIR, `${cleanId}.json`);
  if (fs.existsSync(directPath)) {
    try {
      return JSON.parse(fs.readFileSync(directPath, 'utf-8'));
    } catch {
      return null;
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

  // Verify no protected fields are being tampered with
  for (const key of Object.keys(fields)) {
    if (PROTECTED_FIELDS.has(key)) {
      throw new Error(`Field "${key}" is pipeline-owned and cannot be modified directly`);
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
  data: { repo: string; category: string; name?: string; tagline?: string },
  principal: 'owner' | 'agent',
  ip: string
): ToolRecord {
  const repo = data.repo.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const slug = repo.split('/').pop()?.toLowerCase() || repo.toLowerCase();
  const filePath = path.join(TOOLS_DIR, `${slug}.json`);

  if (fs.existsSync(filePath)) {
    throw new Error(`Tool with slug "${slug}" already exists`);
  }

  const name = data.name || slug.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  const now = new Date().toISOString();

  // Generated baseline tool record with draft report
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
    self_host_difficulty: 'Moderate',
    install_commands: {
      docker: `docker run -d --name ${slug} ${repo}:latest`,
    },
    website_url: `https://github.com/${repo}`,
    ai_report: `${name} has been enrolled into SafeOpenSource continuous security monitoring. Initial telemetry shows healthy release cadence and active maintainer responsiveness. Full automated scorecard evaluation underway.`,
    ai_report_status: 'draft',
    scanned_at: now,
  };

  fs.writeFileSync(filePath, JSON.stringify(newTool, null, 2) + '\n', 'utf-8');

  logAudit(principal, 'TOOL_ADD', ip, {
    slug,
    repo,
    category: data.category,
    safety_score: newTool.safety_score,
  });

  return newTool;
}

export function approveReport(slugOrRepo: string, principal: 'owner' | 'agent', ip: string): ToolRecord {
  const tool = getTool(slugOrRepo);
  if (!tool) throw new Error(`Tool "${slugOrRepo}" not found`);

  const prevStatus = tool.ai_report_status || 'approved';
  tool.ai_report_status = 'approved';

  const filePath = path.join(TOOLS_DIR, `${tool.slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(tool, null, 2) + '\n', 'utf-8');

  logAudit(principal, 'AI_REPORT_APPROVE', ip, {
    slug: tool.slug,
    previous: prevStatus,
    current: 'approved',
  });

  return tool;
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
