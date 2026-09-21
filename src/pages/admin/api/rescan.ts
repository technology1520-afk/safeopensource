import type { APIRoute } from 'astro';
import { createJob, updateJob } from '../../../lib/admin/jobs';
import { rescanTool, getAllToolFiles } from '../../../lib/admin/tools-service';
import { logAudit } from '../../../lib/admin/audit';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body allowed (rescan all)
    }

    const repo = body?.repo || 'all';
    const job = createJob('rescan', repo, auth.principal);

    updateJob(job.id, { status: 'running' });

    if (repo !== 'all') {
      const { tool, diff } = rescanTool(repo, auth.principal, auth.ip);
      updateJob(job.id, {
        status: 'completed',
        result: { rescanned: [tool.slug], count: 1, diff },
      });
    } else {
      const files = getAllToolFiles();
      const rescanned: string[] = [];
      for (const file of files) {
        const slug = file.replace('.json', '');
        try {
          rescanTool(slug, auth.principal, auth.ip);
          rescanned.push(slug);
        } catch {
          // Continue
        }
      }
      updateJob(job.id, {
        status: 'completed',
        result: { rescanned, count: rescanned.length },
      });
    }

    logAudit(auth.principal, 'PIPELINE_RESCAN_TRIGGERED', auth.ip, {
      jobId: job.id,
      target: repo,
    });

    return new Response(
      JSON.stringify({
        jobId: job.id,
        status: 'completed',
        target: repo,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Rescan failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

