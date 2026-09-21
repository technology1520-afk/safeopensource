import type { APIRoute } from 'astro';
import { destroySession } from '../../../lib/admin/auth';
import { logAudit } from '../../../lib/admin/audit';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, locals, redirect }) => {
  const auth = locals.auth;
  const sessionId = cookies.get('sos_session')?.value;

  if (sessionId) {
    destroySession(sessionId);
    cookies.delete('sos_session', { path: '/admin' });
  }

  if (auth?.principal) {
    logAudit(auth.principal, 'LOGOUT', auth.ip, {});
  }

  return redirect('/');
};

