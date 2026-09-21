import type { APIRoute } from 'astro';
import { getDraftTools, approveReport } from '../../../lib/admin/tools-service';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const drafts = getDraftTools();
  return new Response(
    JSON.stringify({
      count: drafts.length,
      drafts: drafts.map((d) => ({
        slug: d.slug,
        repo: d.repo,
        name: d.name,
        category: d.category,
        safety_score: d.safety_score,
        ai_report: d.ai_report,
        scanned_at: d.scanned_at,
      })),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  try {
    const body = await request.json();
    if (!body.repo) {
      return new Response(JSON.stringify({ error: 'Missing "repo" or "slug" to approve' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tool = approveReport(body.repo, auth.principal, auth.ip);

    return new Response(
      JSON.stringify({
        success: true,
        slug: tool.slug,
        ai_report_status: tool.ai_report_status,
        message: `AI report for "${tool.name}" approved successfully.`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Approval failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

