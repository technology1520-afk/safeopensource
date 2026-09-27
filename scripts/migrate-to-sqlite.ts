#!/usr/bin/env node

/**
 * Migration Script: Migrate File-Based Storage to SQLite
 * 
 * Sources:
 * - src/data/tools/*.json -> `tools` table
 * - data/audit.jsonl       -> `audit_logs` table
 * 
 * Execution:
 * Runs within an atomic SQLite transaction via Drizzle ORM to ensure
 * consistency and eliminate locks or partial writes.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db, tools, auditLogs, DB_PATH, initDb } from '../src/lib/db/index';
import type { ToolData } from '../src/types/tool';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TOOLS_DIR = path.join(ROOT, 'src', 'data', 'tools');
const AUDIT_FILE = path.join(ROOT, 'data', 'audit.jsonl');

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateTool(tool: any, filename: string): ValidationResult {
  const errors: string[] = [];
  if (!tool.slug) errors.push(`Missing slug in ${filename}`);
  if (!tool.repo) errors.push(`Missing repo in ${filename}`);
  if (!tool.name) errors.push(`Missing name in ${filename}`);
  if (typeof tool.safety_score !== 'number') errors.push(`Missing or non-numeric safety_score in ${filename}`);
  if (!tool.verdict) errors.push(`Missing verdict in ${filename}`);
  if (!tool.components) errors.push(`Missing components in ${filename}`);
  if (!Array.isArray(tool.risk_reasons)) errors.push(`risk_reasons must be an array in ${filename}`);

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function migrate() {
  console.log('=== STARTING SQLITE STORAGE MIGRATION ===\n');
  console.log(`Database Target: ${DB_PATH}`);

  initDb();

  // 1. Process Tool JSON files
  console.log(`\nScanning tool definitions from: ${TOOLS_DIR}`);
  if (!fs.existsSync(TOOLS_DIR)) {
    throw new Error(`Tools directory not found at: ${TOOLS_DIR}`);
  }

  const toolFiles = fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith('.json'));
  console.log(`Discovered ${toolFiles.length} tool JSON files.`);

  const validToolsToInsert: any[] = [];
  let skippedTools = 0;

  for (const file of toolFiles) {
    const fullPath = path.join(TOOLS_DIR, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const raw = JSON.parse(content) as ToolData;

      const validation = validateTool(raw, file);
      if (!validation.valid) {
        console.warn(`[WARN] Skipping ${file} due to validation errors:`, validation.errors);
        skippedTools++;
        continue;
      }

      const now = new Date().toISOString();
      const isUnlisted = raw.unlisted === true || (raw as any).status === 'unlisted';

      validToolsToInsert.push({
        slug: raw.slug.toLowerCase().trim(),
        repo: raw.repo.trim(),
        name: raw.name.trim(),
        tagline: raw.tagline || '',
        category: raw.category || 'developer-tools',
        license_spdx: raw.license_spdx || 'Unknown',
        stars: Number(raw.stars) || 0,
        contributors: Number(raw.contributors) || 0,
        last_push_days: Number(raw.last_push_days) || 0,
        latest_release: raw.latest_release || 'v1.0.0',
        safety_score: Number(raw.safety_score),
        verdict: raw.verdict,
        risk_reasons: Array.isArray(raw.risk_reasons) ? raw.risk_reasons : [],
        scorecard: typeof raw.scorecard === 'number' ? raw.scorecard : null,
        components: raw.components,
        language: raw.language || 'Unknown',
        self_host_difficulty: raw.self_host_difficulty || 'Medium',
        install_commands: raw.install_commands || {},
        website_url: raw.website_url || null,
        ai_report: raw.ai_report || '',
        ai_report_status: raw.ai_report_status || 'approved',
        scanned_at: raw.scanned_at || now,
        use_cases: raw.use_cases || null,
        how_to_use: raw.how_to_use || null,
        requirements: raw.requirements || null,
        audience: raw.audience || null,
        who_for: (raw as any).who_for || null,
        momentum: raw.momentum || null,
        cves: raw.cves || null,
        permission_model: raw.permission_model || null,
        incident_history: raw.incident_history || null,
        unlisted: isUnlisted,
        archived: Boolean(raw.archived),
        advisories_count: Number(raw.advisories_count || raw.cves?.length || 0),
        provenance: raw.provenance || null,
        scanned_at_formatted: raw.scanned_at_formatted || null,
        advisories_source: raw.advisories_source || null,
        created_at: (raw as any).created_at || raw.scanned_at || now,
        updated_at: (raw as any).updated_at || now,
      });
    } catch (err: any) {
      console.error(`[ERROR] Failed to parse ${file}: ${err.message}`);
      skippedTools++;
    }
  }

  // 2. Process Audit Logs
  console.log(`\nScanning audit logs from: ${AUDIT_FILE}`);
  const auditEntriesToInsert: any[] = [];
  let skippedAudit = 0;

  if (fs.existsSync(AUDIT_FILE)) {
    const lines = fs.readFileSync(AUDIT_FILE, 'utf-8').split('\n').filter(Boolean);
    console.log(`Found ${lines.length} audit lines.`);

    for (let i = 0; i < lines.length; i++) {
      try {
        const item = JSON.parse(lines[i]);
        const id = item.id || crypto.randomUUID();
        const timestamp = item.timestamp || item.at || new Date().toISOString();
        const principal = item.principal || item.who || 'anonymous';
        const action = item.action || 'UNKNOWN_ACTION';
        const targetRepo = item.target || item.target_repo || item.slug || item.repo || null;
        const ip = item.ip || '127.0.0.1';
        const diff = item.diff || null;
        const status = item.status === 'failure' ? 'failure' : 'success';
        const details = item.details || item;

        auditEntriesToInsert.push({
          id,
          timestamp,
          principal,
          action,
          target_repo: targetRepo,
          ip,
          diff,
          status,
          details,
        });
      } catch (err: any) {
        console.warn(`[WARN] Skipping malformed audit line #${i + 1}: ${err.message}`);
        skippedAudit++;
      }
    }
  } else {
    console.log('No existing audit.jsonl found. Skipping audit log import.');
  }

  // 3. Transactional Seed into SQLite
  console.log('\nBeginning transactional SQLite seed...');
  const startTime = Date.now();

  db.transaction((tx) => {
    // Upsert tools
    for (const tool of validToolsToInsert) {
      tx.insert(tools)
        .values(tool)
        .onConflictDoUpdate({
          target: tools.slug,
          set: {
            ...tool,
            updated_at: new Date().toISOString(),
          },
        })
        .run();
    }

    // Upsert audit logs
    for (const log of auditEntriesToInsert) {
      tx.insert(auditLogs)
        .values(log)
        .onConflictDoUpdate({
          target: auditLogs.id,
          set: log,
        })
        .run();
    }
  });

  const durationMs = Date.now() - startTime;

  // 4. Output Summary Report
  console.log('\n==========================================');
  console.log('MIGRATION SUMMARY');
  console.log('==========================================');
  console.log(`✓ Tools Migrated:      ${validToolsToInsert.length} (Skipped: ${skippedTools})`);
  console.log(`✓ Audit Logs Migrated: ${auditEntriesToInsert.length} (Skipped: ${skippedAudit})`);
  console.log(`✓ Transaction Time:    ${durationMs}ms`);
  console.log(`✓ SQLite WAL Path:     ${DB_PATH}`);
  console.log('==========================================\n');
}

migrate().catch((err) => {
  console.error('\nFatal Migration Error:', err);
  process.exit(1);
});
