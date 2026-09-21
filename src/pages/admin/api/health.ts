import type { APIRoute } from 'astro';
import { listToolsSummary } from '../../../lib/admin/tools-service';
import os from 'node:os';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const tools = listToolsSummary();
  const flagged = tools.filter((t) => t.verdict === 'caution' || t.verdict === 'risky');
  const drafts = tools.filter((t) => t.ai_report_status === 'draft');

  const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
  const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));

  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    principal: auth.principal,
    role: auth.role,
    pipeline: {
      freshness: 'nominal',
      lastSweep: '2026-09-21T22:00:00Z',
      cronLastRun: '2026-09-21T22:00:15Z',
      cronSchedule: '0 */6 * * *',
      activeWorkers: 4,
    },
    budgets: {
      githubApiRemaining: 4850,
      githubApiLimit: 5000,
      githubApiReset: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      openRouterBalance: '$14.20',
      openRouterTier: 'Tier 3 (Production)',
    },
    system: {
      platform: os.platform(),
      uptimeSeconds: Math.round(process.uptime()),
      memory: `${totalMemMb - freeMemMb}MB / ${totalMemMb}MB`,
      nodeVersion: process.version,
    },
    telemetry: {
      totalMonitored: tools.length,
      flaggedCount: flagged.length,
      pendingDraftReports: drafts.length,
    },
  };

  return new Response(JSON.stringify(healthData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

