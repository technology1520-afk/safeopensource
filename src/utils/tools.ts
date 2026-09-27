import type { ToolData } from '../types/tool';
import { categories } from '../data/categories';
import { db, tools, type ToolEntity } from '../lib/db/index';
import { desc } from 'drizzle-orm';

function entityToToolData(row: ToolEntity): ToolData {
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
    self_host_difficulty: row.self_host_difficulty as any,
    install_commands: row.install_commands,
    website_url: row.website_url ?? undefined,
    ai_report: row.ai_report,
    ai_report_status: row.ai_report_status,
    scanned_at: row.scanned_at,
    use_cases: row.use_cases ?? undefined,
    how_to_use: row.how_to_use ?? undefined,
    requirements: row.requirements ?? undefined,
    audience: row.audience ?? undefined,
    who_for: row.who_for ?? undefined,
    momentum: row.momentum ?? undefined,
    cves: row.cves ?? undefined,
    permission_model: row.permission_model ?? undefined,
    incident_history: row.incident_history ?? undefined,
    unlisted: row.unlisted,
    archived: row.archived,
    advisories_count: row.advisories_count,
    provenance: row.provenance ?? undefined,
    scanned_at_formatted: row.scanned_at_formatted ?? undefined,
    advisories_source: row.advisories_source ?? undefined,
  };
}

/**
 * Fallback to JSON files if DB is empty or during early bootstrap
 */
function getFallbackJsonTools(): ToolData[] {
  try {
    const toolModules = import.meta.glob<{ default: ToolData }>('../data/tools/*.json', { eager: true });
    return Object.values(toolModules).map((mod) => (mod.default ?? mod) as ToolData);
  } catch {
    return [];
  }
}

/**
 * Query all tools synchronously from the SQLite database via Drizzle ORM.
 * Safe for Astro's static site generation (getStaticPaths) and SSR.
 */
export function fetchAllTools(): ToolData[] {
  try {
    const rows = db.select().from(tools).orderBy(desc(tools.safety_score)).all();
    if (rows && rows.length > 0) {
      return rows.map(entityToToolData);
    }
  } catch {
    // Graceful fallback to static JSON
  }
  return getFallbackJsonTools();
}

export function isToolListed(tool: ToolData): boolean {
  if (tool.unlisted === true) return false;
  if ((tool as any).status === 'unlisted') return false;
  return true;
}

export function getAllTools(): ToolData[] {
  return fetchAllTools().filter(isToolListed).sort((a, b) => b.safety_score - a.safety_score);
}

export function getToolBySlug(slug: string): ToolData | undefined {
  const all = fetchAllTools();
  const tool = all.find((t) => t.slug === slug);
  if (!tool || !isToolListed(tool)) return undefined;
  return tool;
}

export function getToolsByCategory(categorySlug: string): ToolData[] {
  return fetchAllTools()
    .filter((t) => isToolListed(t) && t.category === categorySlug)
    .sort((a, b) => b.safety_score - a.safety_score);
}

export function getSafestTools(limit = 3): ToolData[] {
  return fetchAllTools()
    .filter((t) => isToolListed(t) && t.verdict === 'healthy')
    .sort((a, b) => b.safety_score - a.safety_score)
    .slice(0, limit);
}

export function getFlaggedTools(limit = 3): ToolData[] {
  return fetchAllTools()
    .filter((t) => isToolListed(t) && (t.verdict === 'risky' || t.verdict === 'caution'))
    .sort((a, b) => a.safety_score - b.safety_score)
    .slice(0, limit);
}

export function getAlternatives(currentTool: ToolData, limit = 3): ToolData[] {
  return fetchAllTools()
    .filter((t) => isToolListed(t) && t.category === currentTool.category && t.slug !== currentTool.slug)
    .sort((a, b) => b.safety_score - a.safety_score)
    .slice(0, limit);
}

export interface ToolPair {
  a: ToolData;
  b: ToolData;
  pairSlug: string;
}

export function getAllComparisonPairs(): ToolPair[] {
  const pairs: ToolPair[] = [];

  for (const cat of categories) {
    const toolsInCat = getToolsByCategory(cat.slug);
    for (let i = 0; i < toolsInCat.length; i++) {
      for (let j = i + 1; j < toolsInCat.length; j++) {
        const tA = toolsInCat[i];
        const tB = toolsInCat[j];
        pairs.push({
          a: tA,
          b: tB,
          pairSlug: `${tA.slug}-vs-${tB.slug}`
        });
      }
    }
  }

  return pairs;
}

export function getComparisonPairBySlug(pairSlug: string): ToolPair | undefined {
  return getAllComparisonPairs().find((p) => p.pairSlug === pairSlug);
}
