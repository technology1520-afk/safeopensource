import type { ToolData } from '../types/tool';
import { categories } from '../data/categories';

// Eagerly load all tool JSON records
const toolModules = import.meta.glob<{ default: ToolData }>('../data/tools/*.json', { eager: true });

const rawToolsList: ToolData[] = Object.values(toolModules).map((mod) => {
  return (mod.default ?? mod) as ToolData;
});

export function getAllTools(): ToolData[] {
  return [...rawToolsList].sort((a, b) => b.safety_score - a.safety_score);
}

export function getToolBySlug(slug: string): ToolData | undefined {
  return rawToolsList.find((t) => t.slug === slug);
}

export function getToolsByCategory(categorySlug: string): ToolData[] {
  return rawToolsList
    .filter((t) => t.category === categorySlug)
    .sort((a, b) => b.safety_score - a.safety_score);
}

export function getSafestTools(limit = 3): ToolData[] {
  return [...rawToolsList]
    .filter((t) => t.verdict === 'healthy')
    .sort((a, b) => b.safety_score - a.safety_score)
    .slice(0, limit);
}

export function getFlaggedTools(limit = 3): ToolData[] {
  return [...rawToolsList]
    .filter((t) => t.verdict === 'risky' || t.verdict === 'caution')
    .sort((a, b) => a.safety_score - b.safety_score)
    .slice(0, limit);
}

export function getAlternatives(currentTool: ToolData, limit = 3): ToolData[] {
  return rawToolsList
    .filter((t) => t.category === currentTool.category && t.slug !== currentTool.slug)
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

