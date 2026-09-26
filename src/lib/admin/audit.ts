import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface AuditEntry {
  id: string;
  at: string;
  timestamp: string;
  who: 'owner' | 'agent' | 'anonymous';
  principal: 'owner' | 'agent' | 'anonymous';
  action: string;
  target?: string;
  diff?: any;
  ip: string;
  details: Record<string, any>;
}

export interface AuditQueryOptions {
  limit?: number;
  who?: string;
  action?: string;
  target?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.jsonl');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Append an immutable entry to the audit log
 */
export function logAudit(
  principal: 'owner' | 'agent' | 'anonymous',
  action: string,
  ip: string,
  details: Record<string, any> = {}
): AuditEntry {
  ensureDataDir();

  const now = new Date().toISOString();
  const target = details.slug || details.repo || details.target || details.path || details.jobId || undefined;
  const diff = details.diff || undefined;

  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    at: now,
    timestamp: now,
    who: principal,
    principal,
    action,
    target,
    diff,
    ip,
    details,
  };

  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(AUDIT_FILE, line, 'utf-8');
  return entry;
}

/**
 * Read recent entries from the append-only audit log (newest first)
 */
export function getRecentAuditEntries(limit = 20): AuditEntry[] {
  return queryAuditEntries({ limit });
}

/**
 * Query audit log with filtering by who, action, target, and limit
 */
export function queryAuditEntries(options: AuditQueryOptions = {}): AuditEntry[] {
  ensureDataDir();
  if (!fs.existsSync(AUDIT_FILE)) {
    return [];
  }

  const limit = options.limit && options.limit > 0 ? options.limit : 50;
  const filterWho = options.who?.toLowerCase();
  const filterAction = options.action?.toUpperCase();

  try {
    const content = fs.readFileSync(AUDIT_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries: AuditEntry[] = [];

    // Parse from end to start for newest entries
    for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
      try {
        const raw = JSON.parse(lines[i]);
        const entry: AuditEntry = {
          ...raw,
          at: raw.at || raw.timestamp,
          who: raw.who || raw.principal || 'anonymous',
          principal: raw.principal || raw.who || 'anonymous',
        };

        if (filterWho && filterWho !== 'all' && entry.who !== filterWho) {
          continue;
        }

        if (filterAction && filterAction !== 'ALL' && entry.action !== filterAction) {
          continue;
        }

        if (options.target && entry.target && !entry.target.includes(options.target)) {
          continue;
        }

        entries.push(entry);
      } catch {
        // Skip malformed lines if any
      }
    }

    return entries;
  } catch {
    return [];
  }
}
