import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

/**
 * Neon Postgres (Lakebase) connection via the serverless HTTP driver.
 *
 * - DATABASE_URL (pooled) is used for all application traffic.
 * - DATABASE_URL_UNPOOLED (direct) is reserved for drizzle-kit migrations.
 * - `db` is lazily created so static builds without DATABASE_URL never
 *   attempt a connection (they use the JSON catalog fallback instead).
 */

let _db: ReturnType<typeof drizzle> | null = null;

export function getNeonDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set — Neon Postgres is unavailable. Set it via `neon env pull` or Netlify env vars.');
    }
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}

export function neonConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export const tools = schema.tools;
export const auditLogs = schema.auditLogs;
export const scanJobs = schema.scanJobs;
