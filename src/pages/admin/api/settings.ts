import type { APIRoute } from 'astro';
import { getSettings, updateSettings, rotateApiKey } from '../../../lib/admin/settings';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const settings = getSettings();
  // Redact actual key tokens from settings payload
  const safeSettings = {
    ...settings,
    rotatedKeys: settings.rotatedKeys.map((k) => ({
      role: k.role,
      rotatedAt: k.rotatedAt,
      graceValidUntil: new Date(k.rotatedAt + 24 * 60 * 60 * 1000).toISOString(),
    })),
  };

  return new Response(JSON.stringify(safeSettings), {
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

    // Check if this is an API key rotation action
    if (body.action === 'rotate_key') {
      const currentKey = process.env.ADMIN_API_KEY || '';
      const role = body.role === 'readonly' ? 'readonly' : 'admin';
      const result = rotateApiKey(currentKey, role, auth.principal, auth.ip);

      return new Response(
        JSON.stringify({
          success: true,
          message: `API Key rotated. Old key remains valid for 24-hour grace window.`,
          newKey: result.newKey,
          graceExpiresAt: result.graceExpiresAt,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Otherwise, normal settings update
    const updated = updateSettings(body, auth.principal, auth.ip);
    return new Response(JSON.stringify({ success: true, settings: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Settings update failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
