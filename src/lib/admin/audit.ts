import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { desc, eq, like, and, type SQL } from 'drizzle-orm';
import { getNeonDb, neonConfigured } from '../db/neon';
import { auditLogs, type NewAuditLogEntity } from '../db/schema';
import { DATA_DIR } from '../paths';

export interface AuditEntry {
  id: string;
  at: string;
  timestamp: string;
  who: 'owner' | 'agent' | 'anonymous' | string;
  principal: 'owner' | 'agent' | 'anonymous' | string;
  action: string;
  target?: string;
  diff?: any;
  ip: string;
  details: Record<string, any>;
  status?: 'success' | 'failure';
}

export interface AuditQueryOptions {
  limit?: number;
  who?: string;
  action?: string;
  target?: string;
}

/**
 * Append an immutable entry to the audit log in Neon Postgres via Drizzle ORM.
 * Also mirrors to a local JSONL file (best effort) for offline inspection.
 */
export async function logAudit(
  principal: 'owner' | 'agent' | 'anonymous' | string,
  action: string,
  ip: string,
  details: Record<string, any> = {},
  status: 'success' | 'failure' = 'success'
): Promise<AuditEntry> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const target = details.slug || details.repo || details.target || details.path || details.jobId || undefined;
  const diff = details.diff || undefined;

  const entry: AuditEntry = {
    id,
    at: now,
    timestamp: now,
    who: principal,
    principal,
    action,
    target,
    diff,
    ip,
    details,
    status,
  };

  if (neonConfigured()) {
    const newLog: NewAuditLogEntity = {
      id,
      timestamp: now,
      principal,
      action,
      target_repo: target || null,
      ip,
      diff: diff || null,
      status,
      details,
    };

    try {
      await getNeonDb().insert(auditLogs).values(newLog);
    } catch {
      // Non-fatal: DB write failure must not break the request path;
      // the JSONL mirror below still records the event.
    }
  }

  try {
    const dataDir = DATA_DIR;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const auditFilePath = path.join(dataDir, 'audit.jsonl');
    fs.appendFileSync(auditFilePath, JSON.stringify(entry) + '\n', 'utf-8');
  } catch {
    // Non-fatal if filesystem audit log fails
  }

  return entry;
}

/**
 * Read recent entries from Neon (newest first).
 */
export async function getRecentAuditEntries(limit = 20): Promise<AuditEntry[]> {
  return queryAuditEntries({ limit });
}

/**
 * Query audit log with filtering by who, action, target, and limit.
 */
export async function queryAuditEntries(options: AuditQueryOptions = {}): Promise<AuditEntry[]> {
  if (!neonConfigured()) return [];

  const limit = options.limit && options.limit > 0 ? options.limit : 50;
  const conditions: SQL[] = [];

  const filterWho = options.who?.toLowerCase();
  if (filterWho && filterWho !== 'all') {
    conditions.push(eq(auditLogs.principal, filterWho));
  }

  const filterAction = options.action?.toUpperCase();
  if (filterAction && filterAction !== 'ALL') {
    conditions.push(eq(auditLogs.action, filterAction));
  }

  if (options.target) {
    conditions.push(like(auditLogs.target_repo, `%${options.target}%`));
  }

  let q = getNeonDb()
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit)
    .$dynamic();

  if (conditions.length > 0) {
    q = q.where(and(...conditions));
  }

  const rows = await q;

  return rows.map((row) => ({
    id: row.id,
    at: row.timestamp,
    timestamp: row.timestamp,
    who: row.principal,
    principal: row.principal,
    action: row.action,
    target: row.target_repo || undefined,
    diff: row.diff,
    ip: row.ip,
    details: row.details || {},
    status: row.status,
  }));
}
