import type { ToolMomentum, Verdict } from '../types/tool';

export interface TrendingItem {
  slug: string;
  repo: string;
  name: string;
  tagline: string;
  verdict: Verdict;
  safetyScore: number;
  momentum: ToolMomentum | null; // null means honest zero-state: recently added to watchlist
  category: string;
  scannedAt: string;
}

// Telemetry records reflecting 7-day changes and newly added watchlists
export const trendingReposData: TrendingItem[] = [
  {
    slug: 'immich',
    repo: 'immich-app/immich',
    name: 'Immich',
    tagline: 'High performance self-hosted photo and video management solution.',
    verdict: 'healthy',
    safetyScore: 95,
    momentum: {
      scoreDelta: 4.2,
      deltaReason: 'Coordinated disclosure closed; automated CodeQL scanning enabled in CI',
      starGrowth: 1420,
      sparkline: [91, 91.5, 92, 93, 93.8, 94.5, 95]
    },
    category: 'photo-management',
    scannedAt: '2026-09-18T10:00:00Z'
  },
  {
    slug: 'uptime-kuma',
    repo: 'louislam/uptime-kuma',
    name: 'Uptime Kuma',
    tagline: 'A fancy self-hosted monitoring tool with notification integrations.',
    verdict: 'healthy',
    safetyScore: 97,
    momentum: {
      scoreDelta: 2.0,
      deltaReason: 'Dependency pinning verified & OpenSSF Scorecard increased to 9.2',
      starGrowth: 680,
      sparkline: [95, 95, 95.5, 96, 96, 96.5, 97]
    },
    category: 'monitoring-status',
    scannedAt: '2026-09-19T08:30:00Z'
  },
  {
    slug: 'vaultwarden',
    repo: 'dani-garcia/vaultwarden',
    name: 'Vaultwarden',
    tagline: 'Lightweight Bitwarden compatible server written in Rust.',
    verdict: 'healthy',
    safetyScore: 96,
    momentum: {
      scoreDelta: 1.5,
      deltaReason: 'Rust crates audited against RUSTSEC advisory database',
      starGrowth: 540,
      sparkline: [94.5, 94.5, 95, 95, 95.5, 96, 96]
    },
    category: 'password-management',
    scannedAt: '2026-09-17T14:15:00Z'
  },
  {
    slug: 'authentik',
    repo: 'goauthentik/authentik',
    name: 'Authentik',
    tagline: 'The authentication glue you need for all your services.',
    verdict: 'healthy',
    safetyScore: 92,
    momentum: {
      scoreDelta: 3.1,
      deltaReason: 'Security audit published by Cure53; all medium findings resolved',
      starGrowth: 390,
      sparkline: [88.9, 89, 90, 90.5, 91, 91.5, 92]
    },
    category: 'identity-sso',
    scannedAt: '2026-09-18T16:00:00Z'
  },
  {
    slug: 'statping-ng',
    repo: 'statping-ng/statping-ng',
    name: 'Statping-ng',
    tagline: 'Status page & monitoring server for services (community continuation).',
    verdict: 'risky',
    safetyScore: 34,
    momentum: {
      scoreDelta: -4.8,
      deltaReason: 'Security patch regression: unmaintained Docker container base image & CVE-2024-3812',
      starGrowth: 15,
      sparkline: [38.8, 38.0, 37.2, 36.0, 35.5, 34.5, 34.0]
    },
    category: 'monitoring-status',
    scannedAt: '2026-09-20T11:00:00Z'
  },
  {
    slug: 'maybe',
    repo: 'maybe-finance/maybe',
    name: 'Maybe',
    tagline: 'Personal finance and wealth management application.',
    verdict: 'caution',
    safetyScore: 65,
    momentum: {
      scoreDelta: -7.0,
      deltaReason: 'Maintainer shift & 3 unmerged security advisories pending triage',
      starGrowth: 890,
      sparkline: [72, 71, 69, 68, 67, 66, 65]
    },
    category: 'finance-budgeting',
    scannedAt: '2026-09-19T13:45:00Z'
  },
  // Honest Zero-States: Recently added to watchlist, no fabricated sparklines
  {
    slug: 'affine',
    repo: 'toeverything/AFFiNE',
    name: 'AFFiNE',
    tagline: 'Next-gen knowledge base that brings together planning, sorting and creating.',
    verdict: 'caution',
    safetyScore: 78,
    momentum: null, // Zero-state: recently added to watchlist
    category: 'notes-pkm',
    scannedAt: '2026-09-20T04:20:00Z'
  },
  {
    slug: 'actual-budget',
    repo: 'actualbudget/actual',
    name: 'Actual Budget',
    tagline: 'A super fast and privacy-focused personal finance app.',
    verdict: 'healthy',
    safetyScore: 93,
    momentum: null, // Zero-state: recently added to watchlist
    category: 'finance-budgeting',
    scannedAt: '2026-09-21T09:10:00Z'
  },
  {
    slug: 'seafile',
    repo: 'haiwen/seafile',
    name: 'Seafile',
    tagline: 'High performance file syncing and sharing solution.',
    verdict: 'healthy',
    safetyScore: 89,
    momentum: null, // Zero-state: recently added to watchlist
    category: 'cloud-storage',
    scannedAt: '2026-09-19T22:00:00Z'
  }
];

export function getTrendingByFilter(filter: 'velocity' | 'new-entrants' | 'score-drops'): TrendingItem[] {
  if (filter === 'new-entrants') {
    return trendingReposData.filter((item) => item.momentum === null);
  }
  if (filter === 'score-drops') {
    return trendingReposData
      .filter((item) => item.momentum !== null && item.momentum.scoreDelta < 0)
      .sort((a, b) => (a.momentum?.scoreDelta || 0) - (b.momentum?.scoreDelta || 0));
  }
  // Default 'velocity'
  return trendingReposData
    .filter((item) => item.momentum !== null && item.momentum.scoreDelta > 0)
    .sort((a, b) => Math.abs(b.momentum?.scoreDelta || 0) - Math.abs(a.momentum?.scoreDelta || 0));
}
