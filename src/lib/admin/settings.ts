import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { logAudit } from './audit';

export interface AnnouncementSettings {
  text: string;
  enabled: boolean;
  startDate?: string;
  endDate?: string;
}

export interface RotatedKey {
  key: string;
  role: 'admin' | 'readonly';
  rotatedAt: number;
}

export interface AdminSettings {
  announcement: AnnouncementSettings;
  adSlotsEnabled: boolean;
  starterKitsVisible: boolean;
  rotatedKeys: RotatedKey[];
}

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

const DEFAULT_SETTINGS: AdminSettings = {
  announcement: {
    text: 'SafeOpenSource SOC v2.4 Active: Automated vulnerability sweeps running on a 6h cadence.',
    enabled: true,
    startDate: new Date().toISOString(),
    endDate: '',
  },
  adSlotsEnabled: true,
  starterKitsVisible: true,
  rotatedKeys: [],
};

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getSettings(): AdminSettings {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      announcement: {
        ...DEFAULT_SETTINGS.announcement,
        ...(parsed.announcement || {}),
      },
      rotatedKeys: Array.isArray(parsed.rotatedKeys) ? parsed.rotatedKeys : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AdminSettings): void {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

export function updateSettings(
  partial: Partial<AdminSettings>,
  principal: 'owner' | 'agent',
  ip: string
): AdminSettings {
  const current = getSettings();
  const updated: AdminSettings = {
    ...current,
    ...partial,
    announcement: partial.announcement
      ? { ...current.announcement, ...partial.announcement }
      : current.announcement,
  };

  saveSettings(updated);

  logAudit(principal, 'SETTINGS_UPDATE', ip, {
    modified: Object.keys(partial),
  });

  return updated;
}

/**
 * Check if a token matches an old rotated key that is still within the 24-hour grace period
 */
export function checkRotatedKeyGrace(token: string): { valid: boolean; role?: 'admin' | 'readonly' } {
  const settings = getSettings();
  const now = Date.now();
  const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

  for (const rKey of settings.rotatedKeys) {
    if (rKey.key === token) {
      if (now - rKey.rotatedAt <= GRACE_PERIOD_MS) {
        return { valid: true, role: rKey.role };
      }
    }
  }

  return { valid: false };
}

/**
 * Rotate API Key:
 * Stores current key into rotatedKeys array with 24h grace period.
 * Generates and returns a fresh 32-byte hex key.
 */
export function rotateApiKey(
  currentKey: string,
  role: 'admin' | 'readonly',
  principal: 'owner' | 'agent',
  ip: string
): { newKey: string; graceExpiresAt: string } {
  const settings = getSettings();
  const now = Date.now();
  const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

  // Add existing key to rotated list
  if (currentKey) {
    settings.rotatedKeys = settings.rotatedKeys.filter((k) => k.key !== currentKey);
    settings.rotatedKeys.push({
      key: currentKey,
      role,
      rotatedAt: now,
    });
  }

  // Generate new 32-byte key
  const newKey = crypto.randomBytes(32).toString('hex');
  saveSettings(settings);

  const graceExpiresAt = new Date(now + GRACE_PERIOD_MS).toISOString();

  logAudit(principal, 'API_KEY_ROTATED', ip, {
    role,
    graceExpiresAt,
  });

  return { newKey, graceExpiresAt };
}
