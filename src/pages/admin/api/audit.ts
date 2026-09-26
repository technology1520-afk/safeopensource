import type { APIRoute } from 'astro';
import { queryAuditEntries } from '../../../lib/admin/audit';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const who = url.searchParams.get('who') || undefined;
  const action = url.searchParams.get('action') || undefined;
  const target = url.searchParams.get('target') || undefined;

  const entries = queryAuditEntries({ limit, who, action, target });

  return new Response(JSON.stringify(entries), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
