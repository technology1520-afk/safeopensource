import type { APIRoute } from 'astro';
import { rejectTool } from '../../../../../lib/admin/tools-service';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing tool ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let reason = 'Owner rejected';
  try {
    const body = await request.json();
    if (body.reason) {
      reason = body.reason;
    }
  } catch {
    // Continue with default reason
  }

  try {
    rejectTool(id, reason, auth.principal, auth.ip);
    return new Response(
      JSON.stringify({
        success: true,
        message: `Tool "${id}" rejected and deleted.`,
        id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Rejection failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
