import { getAllTools } from './tools';
import type { Verdict } from '../types/tool';
import { categories } from '../data/categories';

export interface RadarBlip {
  name: string;
  repo: string;
  slug: string;
  score: number;
  verdict: Verdict;
  category: string;
  angle: number;   // 0 - 360 deg
  radius: number;  // Distance from center (0 to 150)
  bearing: string; // e.g. "BRG 214°"
  rangeVal: string;// e.g. "RNG 0.62"
  lastScanned: string;
  isFlagged: boolean;
  color: string;
}

export interface TelemetryStats {
  totalWatched: number;
  healthyCount: number;
  cautionCount: number;
  riskyCount: number;
  flaggedCount: number;
  nominalPercentage: number;
  averageScore: number;
  averageScorecard: number;
  latestSweepTimestamp: string;
  radarBlips: RadarBlip[];
}

export function getTelemetryStats(): TelemetryStats {
  const tools = getAllTools();
  const totalWatched = tools.length;

  const healthyCount = tools.filter((t) => t.verdict === 'healthy').length;
  const cautionCount = tools.filter((t) => t.verdict === 'caution').length;
  const riskyCount = tools.filter((t) => t.verdict === 'risky').length;
  const flaggedCount = cautionCount + riskyCount;

  const nominalPercentage = totalWatched > 0
    ? Number(((healthyCount / totalWatched) * 100).toFixed(1))
    : 0;

  const averageScore = totalWatched > 0
    ? Number((tools.reduce((acc, t) => acc + t.safety_score, 0) / totalWatched).toFixed(1))
    : 0;

  const scoredTools = tools.filter((t) => t.scorecard !== null);
  const averageScorecard = scoredTools.length > 0
    ? Number((scoredTools.reduce((acc, t) => acc + (t.scorecard || 0), 0) / scoredTools.length).toFixed(1))
    : 0;

  // Generate deterministic radar blips from actual monitored tools
  // Radius: 100 - score scaled (higher score = closer to center, risky = outer ring)
  // Angle: distributed across categories and tools
  const radarBlips: RadarBlip[] = tools.map((t, idx) => {
    const catIdx = categories.findIndex((c) => c.slug === t.category);
    const baseAngle = catIdx >= 0 ? (catIdx / categories.length) * 360 : (idx / tools.length) * 360;
    // Add deterministic jitter based on string hash of tool slug
    let hash = 0;
    for (let i = 0; i < t.slug.length; i++) {
      hash = (hash << 5) - hash + t.slug.charCodeAt(i);
      hash |= 0;
    }
    const jitterAngle = (Math.abs(hash) % 24) - 12;
    const angle = Math.round((baseAngle + jitterAngle + 360) % 360);

    // Invert score so safest tools are closer to center (R=35 to 80), risky are farther out (R=120 to 155)
    // Range normalized from 0.20 to 0.95
    const normalizedDist = Math.max(0.2, Math.min(0.95, (105 - t.safety_score) / 80));
    const radius = Math.round(normalizedDist * 160);

    const isFlagged = t.verdict === 'risky' || t.verdict === 'caution';
    const color = t.verdict === 'healthy' ? 'var(--healthy)' : t.verdict === 'caution' ? 'var(--caution)' : 'var(--risky)';

    return {
      name: t.name,
      repo: t.repo,
      slug: t.slug,
      score: t.safety_score,
      verdict: t.verdict,
      category: t.category,
      angle,
      radius,
      bearing: `BRG ${String(angle).padStart(3, '0')}°`,
      rangeVal: `RNG ${normalizedDist.toFixed(2)}`,
      lastScanned: t.scanned_at,
      isFlagged,
      color
    };
  });

  return {
    totalWatched,
    healthyCount,
    cautionCount,
    riskyCount,
    flaggedCount,
    nominalPercentage,
    averageScore,
    averageScorecard,
    latestSweepTimestamp: '2h ago',
    radarBlips
  };
}
