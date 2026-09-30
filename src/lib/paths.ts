import path from 'node:path';
import fs from 'node:fs';

/**
 * Writable data directory.
 * - Local dev / Node server: <project>/data
 * - Netlify (read-only FS except /tmp): SOS_DATA_DIR env or /tmp/sos-data
 * Set SOS_DATA_DIR to override in any environment.
 */
export const DATA_DIR =
  process.env.SOS_DATA_DIR ||
  (process.env.NETLIFY ? '/tmp/sos-data' : path.join(process.cwd(), 'data'));

export const SCANS_DIR = path.join(DATA_DIR, 'scans');

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCANS_DIR)) {
    fs.mkdirSync(SCANS_DIR, { recursive: true });
  }
}
