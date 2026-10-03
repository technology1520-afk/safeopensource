import type { ToolData } from '../types/tool';
import { categories } from '../data/categories';

/**
 * Data layer.
 *
 * The catalog (src/data/tools/*.json) is committed to git and loaded at build
 * time via import.meta.glob — static pages never touch the network.
 * The dynamic layer (admin panel, MCP server, on-demand scans) reads and
 * writes the `tools` table in Neon Postgres via the serverless HTTP driver
 * (see src/lib/db/index.ts). When DATABASE_URL is absent (static build,
 * local preview), every helper below falls back to the JSON catalog.
 */

/**
 * Fallback to committed JSON files — always available, zero network.
 */
export function getFallbackJsonTools(): ToolData[] {
  try {
    const toolModules = import.meta.glob<{ default: ToolData }>('../data/tools/*.json', { eager: true });
    return Object.values(toolModules).map((mod) => (mod.default ?? mod) as ToolData);
  } catch {
    return [];
  }
}

export function isToolListed(tool: ToolData): boolean {
  if (tool.unlisted === true) return false;
  if ((tool as any).status === 'unlisted') return false;
  return true;
}

export function sortTools(list: ToolData[]): ToolData[] {
  return [...list].sort((a, b) => b.safety_score - a.safety_score);
}

// ---------------------------------------------------------------------------
// JSON-based synchronous helpers (static build + fallback paths)
// ---------------------------------------------------------------------------

export function getAllTools(): ToolData[] {
  return sortTools(getFallbackJsonTools().filter(isToolListed));
}

export function getToolBySlug(slug: string): ToolData | undefined {
  const tool = getFallbackJsonTools().find((t) => t.slug === slug);
  if (!tool || !isToolListed(tool)) return undefined;
  return tool;
}

export function getToolsByCategory(categorySlug: string): ToolData[] {
  return sortTools(getFallbackJsonTools().filter((t) => isToolListed(t) && t.category === categorySlug));
}

export function getSafestTools(limit = 3): ToolData[] {
  return getAllTools().filter((t) => t.verdict === 'healthy').slice(0, limit);
}

export function getFlaggedTools(limit = 3): ToolData[] {
  return getAllTools()
    .filter((t) => t.verdict === 'risky' || t.verdict === 'caution')
    .sort((a, b) => a.safety_score - b.safety_score)
    .slice(0, limit);
}

export function getAlternatives(currentTool: ToolData, limit = 3): ToolData[] {
  return getAllTools()
    .filter((t) => isToolListed(t) && t.category === currentTool.category && t.slug !== currentTool.slug)
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
