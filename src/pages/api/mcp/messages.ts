import type { APIRoute } from 'astro';
import {
  authenticateMcpRequest,
  getSession,
  detectScoreTampering,
  MockPostResponse,
} from '../../../lib/mcp/server';

export const prerender = false;

const MUTATING_TOOLS = new Set([
  'sos_rescan',
  'sos_add_tool',
  'sos_edit_tool',
  'sos_update_content',
  'sos_approve',
  'sos_reject',
  'sos_rebuild',
]);

export const POST: APIRoute = async ({ request }) => {
  // 1. Authenticate bearer token using timingSafeEqual
  const auth = await authenticateMcpRequest(request);

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

  // 2. Validate session ID from URL query parameters
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    return new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: 'Missing "sessionId" query parameter',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const session = getSession(sessionId);
  if (!session) {
    return new Response(
      JSON.stringify({
        error: 'Not Found',
        message: `SSE session "${sessionId}" not found or expired. Please re-establish stream at /api/mcp/sse`,
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 3. Parse and validate JSON-RPC payload
  let parsedBody: any;
  try {
    parsedBody = await request.json();
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: 'Invalid JSON payload in request body',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const rpcMethod = parsedBody?.method;
  const toolName = parsedBody?.params?.name;
  const toolArgs = parsedBody?.params?.arguments || {};

  // 4. HTTP 422 Defensive Invariant: Reject score tampering attempts
  if (rpcMethod === 'tools/call' && (toolName === 'sos_edit_tool' || toolName === 'sos_update_content')) {
    const offendingField = detectScoreTampering(toolArgs) || detectScoreTampering(toolArgs.fields);
    if (offendingField) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: parsedBody?.id ?? null,
          error: {
            code: -32602,
            message: `HTTP 422 Unprocessable Entity: Score tampering prohibited. Field "${offendingField}" is pipeline-owned and cannot be modified.`,
            data: { status: 422, field: offendingField },
          },
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // 5. Two-Tier Permission Model Enforcement
  const isReadOnly = session.role === 'readonly' || auth.role === 'readonly';
  if (isReadOnly && rpcMethod === 'tools/call' && MUTATING_TOOLS.has(toolName)) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: parsedBody?.id ?? null,
        error: {
          code: -32600,
          message: `HTTP 403 Forbidden: Read-only token cannot execute mutating tool "${toolName}". Full ADMIN_API_KEY required.`,
          data: { status: 403, tool: toolName },
        },
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 6. Forward payload to SSEServerTransport
  session.lastActivity = Date.now();
  const mockReq = {
    headers: Object.fromEntries(request.headers.entries()),
    url: request.url,
    socket: {},
  };
  const mockRes = new MockPostResponse();

  try {
    await session.transport.handlePostMessage(mockReq as any, mockRes as any, parsedBody);

    return new Response(mockRes.body || 'Accepted', {
      status: mockRes.statusCode || 202,
      headers: {
        'Content-Type': 'text/plain',
        ...mockRes.headers,
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: 'Transport Error',
        message: err.message || 'Failed to dispatch message to SSE transport',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
