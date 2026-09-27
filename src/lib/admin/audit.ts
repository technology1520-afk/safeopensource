import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { desc, eq, like, and, type SQL } from 'drizzle-orm';
import { db, auditLogs, type NewAuditLogEntity } from '../db/index';

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
 * Append an immutable entry to the audit log in SQLite via Drizzle ORM.
 */
export function logAudit(
  principal: 'owner' | 'agent' | 'anonymous' | string,
  action: string,
  ip: string,
  details: Record<string, any> = {},
  status: 'success' | 'failure' = 'success'
): AuditEntry {
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

  db.insert(auditLogs).values(newLog).run();

  try {
    const dataDir = path.join(process.cwd(), 'data');
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
 * Read recent entries from SQLite (newest first).
 */
export function getRecentAuditEntries(limit = 20): AuditEntry[] {
  return queryAuditEntries({ limit });
}

/**
 * Query audit log with filtering by who, action, target, and limit.
 */
export function queryAuditEntries(options: AuditQueryOptions = {}): AuditEntry[] {
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

  const query = db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);

  const rows = conditions.length > 0
    ? query.where(and(...conditions)).all()
    : query.all();

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
