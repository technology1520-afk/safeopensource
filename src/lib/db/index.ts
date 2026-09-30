import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import * as schema from './schema';

const DATA_DIR = process.env.SOS_DATA_DIR || (process.env.NETLIFY ? '/tmp/sos-data' : path.join(process.cwd(), 'data'));
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // Read-only filesystem (serverless): fall back to /tmp
    if (!fs.existsSync('/tmp/sos-data')) fs.mkdirSync('/tmp/sos-data', { recursive: true });
  }
}

export const DB_PATH = process.env.SQLITE_DB_PATH || path.join(DATA_DIR, 'safety-opensource.db');

export const sqlite = new Database(DB_PATH);

// Configure SQLite pragmas for high concurrency, zero reader/writer locks
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

/**
 * Initialize all database tables and indexes if they do not exist.
 */
export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tools (
      slug TEXT PRIMARY KEY,
      repo TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      category TEXT NOT NULL,
      license_spdx TEXT NOT NULL,
      stars INTEGER NOT NULL,
      contributors INTEGER NOT NULL,
      last_push_days INTEGER NOT NULL,
      latest_release TEXT NOT NULL,
      safety_score REAL NOT NULL,
      verdict TEXT NOT NULL,
      risk_reasons TEXT NOT NULL,
      scorecard REAL,
      components TEXT NOT NULL,
      language TEXT NOT NULL,
      self_host_difficulty TEXT NOT NULL,
      install_commands TEXT NOT NULL,
      website_url TEXT,
      logo_url TEXT,
      ai_report TEXT NOT NULL,
      ai_report_status TEXT NOT NULL DEFAULT 'approved',
      scanned_at TEXT NOT NULL,
      use_cases TEXT,
      how_to_use TEXT,
      requirements TEXT,
      audience TEXT,
      who_for TEXT,
      momentum TEXT,
      cves TEXT,
      permission_model TEXT,
      incident_history TEXT,
      unlisted INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      advisories_count INTEGER NOT NULL DEFAULT 0,
      provenance TEXT,
      scanned_at_formatted TEXT,
      advisories_source TEXT,
      epss_score REAL,
      osv_advisories TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      principal TEXT NOT NULL,
      action TEXT NOT NULL,
      target_repo TEXT,
      ip TEXT NOT NULL,
      diff TEXT,
      status TEXT NOT NULL DEFAULT 'success',
      details TEXT
    );

    CREATE TABLE IF NOT EXISTS scan_jobs (
      id TEXT PRIMARY KEY,
      repo_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      priority INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      finished_at TEXT,
      error TEXT,
      result TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
    CREATE INDEX IF NOT EXISTS idx_tools_safety_score ON tools(safety_score);
    CREATE INDEX IF NOT EXISTS idx_tools_unlisted ON tools(unlisted);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_scan_jobs_status ON scan_jobs(status);
  `);

  try { sqlite.exec("ALTER TABLE tools ADD COLUMN epss_score REAL;"); } catch {}
  try { sqlite.exec("ALTER TABLE tools ADD COLUMN osv_advisories TEXT;"); } catch {}
  try { sqlite.exec("ALTER TABLE tools ADD COLUMN logo_url TEXT;"); } catch {}
}

// Guarantee tables exist upon module import
initDb();

export * from './schema';
