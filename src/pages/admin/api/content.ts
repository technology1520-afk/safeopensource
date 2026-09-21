import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { logAudit } from '../../../lib/admin/audit';

export const prerender = false;

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'content-settings.json');

const defaultSettings = {
  announcementBanner: {
    enabled: false,
    text: '',
    type: 'info', // info | warning | alert
    startAt: null,
    endAt: null,
  },
  adSlots: {
    enabled: false,
    placement: 'footer-only',
  },
  starterKitsEnabled: true,
};

function getContentSettings() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2) + '\n', 'utf-8');
    return defaultSettings;
  }
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch {
    return defaultSettings;
  }
}

export const GET: APIRoute = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const settings = getContentSettings();
  return new Response(JSON.stringify(settings), {
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
    const current = getContentSettings();
    const updated = { ...current, ...body };

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2) + '\n', 'utf-8');

    logAudit(auth.principal, 'CONTENT_SETTINGS_UPDATE', auth.ip, {
      updatedKeys: Object.keys(body),
    });

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to update content settings' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

