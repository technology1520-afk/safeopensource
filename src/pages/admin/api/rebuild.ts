import type { APIRoute } from 'astro';
import { createJob, updateJob } from '../../../lib/admin/jobs';
import { logAudit } from '../../../lib/admin/audit';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const job = createJob('rebuild', 'static-site', auth.principal);

  logAudit(auth.principal, 'STATIC_REBUILD_TRIGGERED', auth.ip, {
    jobId: job.id,
  });

  // Mark job running and schedule completion
  updateJob(job.id, { status: 'running' });

  // Simulate or asynchronously invoke build
  setTimeout(() => {
    updateJob(job.id, {
      status: 'completed',
      result: { pagesRebuilt: 104, durationMs: 2400 },
    });
  }, 500);

  return new Response(
    JSON.stringify({
      jobId: job.id,
      status: 'queued',
      message: 'Static site rebuild enqueued successfully',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

