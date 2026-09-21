import { defineMiddleware } from 'astro:middleware';
import { authenticateRequest, validateCsrf } from './lib/admin/auth';
import { logAudit } from './lib/admin/audit';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Only intercept /admin and /admin/* routes
  if (!pathname.startsWith('/admin')) {
    return next();
  }

  const cookieSessionId = context.cookies.get('sos_session')?.value;

  // Handle /admin/login page specifically
  if (pathname === '/admin/login' || pathname === '/admin/login/') {
    // If owner already has a valid session and does GET /admin/login, redirect to /admin
    if (context.request.method === 'GET' && cookieSessionId) {
      const auth = await authenticateRequest(context.request, cookieSessionId);
      if (auth.principal === 'owner') {
        return context.redirect('/admin');
      }
    }
    // Allow login page access (GET to render form, POST to authenticate)
    return next();
  }

  // Authenticate all other /admin routes
  const auth = await authenticateRequest(context.request, cookieSessionId);

  // 1. If IP is rate-limited after multiple auth failures
  if (auth.rateLimited) {
    return new Response(
      JSON.stringify({ error: auth.error || 'Too many failed attempts. Rate limited.' }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 2. If an explicit auth attempt failed (e.g. invalid Bearer key)
  if (auth.error) {
    logAudit('anonymous', 'AUTH_FAILURE', auth.ip, {
      path: pathname,
      method: context.request.method,
      error: auth.error,
    });
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Hard Security Rule: Unauthenticated /admin or /admin/api/* requests return 404 with empty body
  if (!auth.principal) {
    return new Response('', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // 4. Role restrictions for agent (read-only key cannot perform mutating requests)
  const isMutating = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(context.request.method);
  if (auth.principal === 'agent' && auth.role === 'readonly' && isMutating) {
    return new Response(
      JSON.stringify({ error: 'Forbidden: read-only API key cannot perform mutating operations' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 5. CSRF enforcement for owner mutating operations
  if (auth.principal === 'owner' && isMutating && pathname !== '/admin/api/logout') {
    let csrfToken = context.request.headers.get('x-csrf-token') || url.searchParams.get('csrf');

    if (!csrfToken) {
      try {
        const cloned = context.request.clone();
        const contentType = cloned.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const body = await cloned.json();
          csrfToken = body.csrf || body.csrfToken;
        } else if (
          contentType.includes('application/x-www-form-urlencoded') ||
          contentType.includes('multipart/form-data')
        ) {
          const formData = await cloned.formData();
          csrfToken = formData.get('csrf') as string;
        }
      } catch {
        // Fall through
      }
    }

    if (!auth.session || !validateCsrf(auth.session, csrfToken)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Invalid or missing CSRF token' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Attach verified auth to context locals
  context.locals.auth = auth;
  return next();
});

