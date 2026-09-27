import type { APIRoute } from 'astro';
import { authenticateMcpRequest, setupMcpSession, removeSession } from '../../../lib/mcp/server';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  // 1. Authenticate bearer token using constant-time comparison
  const auth = authenticateMcpRequest(request);

  if (auth.rateLimited) {
    return new Response(
      JSON.stringify({ error: auth.error || 'Too many failed authentication attempts. Rate limited.' }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!auth.authenticated || !auth.role) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        message: auth.error || 'Valid Bearer token required in Authorization header',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  let sessionCleanedUp = false;
  let activeSessionId: string | null = null;

  // 2. Set up SSE stream bridged with SSEServerTransport
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const session = await setupMcpSession(auth.role!, auth.ip, controller);
        activeSessionId = session.sessionId;

        // Clean up when client disconnects or aborts
        request.signal.addEventListener('abort', () => {
          if (!sessionCleanedUp && activeSessionId) {
            sessionCleanedUp = true;
            removeSession(activeSessionId);
          }
        });
      } catch (err: any) {
        controller.error(err);
      }
    },
    cancel() {
      if (!sessionCleanedUp && activeSessionId) {
        sessionCleanedUp = true;
        removeSession(activeSessionId);
      }
    },
  });

  // 3. Return streaming SSE response with headers configured for reverse proxies (Caddy, Nginx)
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Tells Caddy and Nginx to flush chunks immediately
    },
  });
};
