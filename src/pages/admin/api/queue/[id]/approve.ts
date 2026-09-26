import type { APIRoute } from 'astro';
import { approveTool } from '../../../../../lib/admin/tools-service';

export const prerender = false;

export const POST: APIRoute = async ({ params, locals }) => {
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

  try {
    const tool = approveTool(id, auth.principal, auth.ip);
    return new Response(
      JSON.stringify({
        success: true,
        message: `Tool "${tool.name}" approved and listed.`,
        tool,
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
