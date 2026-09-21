import type { APIRoute } from 'astro';
import { listToolsSummary, addTool } from '../../../../lib/admin/tools-service';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const tools = listToolsSummary();
  return new Response(JSON.stringify(tools), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  try {
    const body = await request.json();
    if (!body.repo || !body.category) {
      return new Response(
        JSON.stringify({ error: 'Both "repo" (e.g. owner/repo) and "category" are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const createdTool = addTool(body, auth.principal, auth.ip);

    return new Response(JSON.stringify(createdTool), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to add tool' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

