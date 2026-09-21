import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface AuditEntry {
  id: string;
  timestamp: string;
  principal: 'owner' | 'agent' | 'anonymous';
  action: string;
  ip: string;
  details: Record<string, any>;
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

  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    principal,
    action,
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
  ensureDataDir();
  if (!fs.existsSync(AUDIT_FILE)) {
    return [];
  }

  try {
    const content = fs.readFileSync(AUDIT_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries: AuditEntry[] = [];

    // Parse from end to start for newest entries
    for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
      try {
        entries.push(JSON.parse(lines[i]));
      } catch {
        // Skip malformed lines if any
      }
    }

    return entries;
  } catch {
    return [];
  }
}
