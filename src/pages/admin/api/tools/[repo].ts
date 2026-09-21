import type { APIRoute } from 'astro';
import { getTool, patchToolContent } from '../../../../lib/admin/tools-service';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const { repo } = params;
  if (!repo) {
    return new Response(JSON.stringify({ error: 'Missing tool identifier' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tool = getTool(repo);
  if (!tool) {
    return new Response(JSON.stringify({ error: `Tool "${repo}" not found` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(tool), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const { repo } = params;
  if (!repo) {
    return new Response(JSON.stringify({ error: 'Missing tool identifier' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const fields = await request.json();
    const { tool, diff } = patchToolContent(repo, fields, auth.principal, auth.ip);

    return new Response(
      JSON.stringify({
        success: true,
        tool,
        diff,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Update failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
