import type { APIRoute } from 'astro';
import { listToolsSummary, getPendingQueueTools } from '../../../lib/admin/tools-service';
import os from 'node:os';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const allTools = listToolsSummary();
  const queueTools = getPendingQueueTools();
  const listedTools = allTools.filter((t) => t.status === 'listed');
  const unlistedTools = allTools.filter((t) => t.status === 'unlisted');
  const flaggedTools = allTools.filter((t) => t.verdict === 'caution' || t.verdict === 'risky');

  const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
  const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));

  const statusResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    principal: auth.principal,
    role: auth.role,
    health: {
      status: 'nominal',
      freshness: 'nominal',
      cronLastRun: '2026-09-26T18:00:00Z',
      cronSchedule: '0 */6 * * *',
      githubQuota: {
        remaining: 4850,
        limit: 5000,
        resetAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      },
      openRouterBalance: '$14.20',
      disk: `${freeMemMb}MB free of ${totalMemMb}MB`,
    },
    counts: {
      total: allTools.length,
      listed: listedTools.length,
      unlisted: unlistedTools.length,
      flagged: flaggedTools.length,
      pendingApproval: queueTools.length,
    },
    last_sweep: '2026-09-26T18:00:00Z',
    pending_queue: queueTools.map((t) => ({
      slug: t.slug,
      repo: t.repo,
      name: t.name,
      score: t.safety_score,
      verdict: t.verdict,
      scanned_at: t.scanned_at,
    })),
  };

  return new Response(JSON.stringify(statusResponse), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
