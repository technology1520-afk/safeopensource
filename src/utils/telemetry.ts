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
  angle: number;        // 0 - 360 deg (bearing encodes category)
  radius: number;       // Radial distance (0 to 156, mapped to SCORE 0..100)
  bearing: string;      // e.g. "BRG 214°"
  rangeVal: string;     // e.g. "SCORE 42"
  lastScanned: string;
  isFlagged: boolean;
  color: string;
  labelSide: 'left' | 'right';
  labelDy: number;
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

  const nominalPercentage =
    totalWatched > 0
      ? Number(((healthyCount / totalWatched) * 100).toFixed(1))
      : 0;

  const averageScore =
    totalWatched > 0
      ? Number(
          (
            tools.reduce((acc, t) => acc + t.safety_score, 0) / totalWatched
          ).toFixed(1)
        )
      : 0;

  const scoredTools = tools.filter((t) => t.scorecard !== null);
  const averageScorecard =
    scoredTools.length > 0
      ? Number(
          (
            scoredTools.reduce((acc, t) => acc + (t.scorecard || 0), 0) /
            scoredTools.length
          ).toFixed(1)
        )
      : 0;

  // Group tools by category to distribute bearings cleanly without overlap
  const categoryCounts = new Map<string, number>();
  let flaggedIndex = 0;

  const radarBlips: RadarBlip[] = tools.map((t, idx) => {
    const catIdx = categories.findIndex((c) => c.slug === t.category);
    const seenInCat = categoryCounts.get(t.category) || 0;
    categoryCounts.set(t.category, seenInCat + 1);

    const sectorWidth = 360 / categories.length;
    const baseAngle =
      catIdx >= 0
        ? catIdx * sectorWidth + (seenInCat + 0.5) * (sectorWidth / 3.2)
        : (idx / tools.length) * 360;

    const angle = Math.round((baseAngle + 360) % 360);

    // Radial axis IS the safety score (0-100, center=0, rim=100, gridlines at 25/50/75/100 -> r=40/80/120/160)
    const clampedScore = Math.max(15, Math.min(98, t.safety_score));
    const radius = Math.round((clampedScore / 100) * 156);

    const isFlagged = t.verdict === 'risky' || t.verdict === 'caution';
    const color =
      t.verdict === 'healthy'
        ? 'var(--healthy)'
        : t.verdict === 'caution'
          ? 'var(--caution)'
          : 'var(--risky)';

    // Collision-resolved label placement: alternate left/right and stagger vertical offset
    let labelSide: 'left' | 'right' = angle > 180 ? 'left' : 'right';
    let labelDy = 3;
    if (isFlagged) {
      labelSide = flaggedIndex % 2 === 0 ? 'right' : 'left';
      const verticalSteps = [-10, 4, 14, -14, 10, -6];
      labelDy = verticalSteps[flaggedIndex % verticalSteps.length];
      flaggedIndex++;
    } else {
      labelSide = seenInCat % 2 === 0 ? 'right' : 'left';
      labelDy = seenInCat === 0 ? -7 : seenInCat === 1 ? 5 : 13;
    }

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
      rangeVal: `SCORE ${Math.round(t.safety_score)}`,
      lastScanned: t.scanned_at,
      isFlagged,
      color,
      labelSide,
      labelDy
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
