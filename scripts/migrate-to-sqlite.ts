#!/usr/bin/env node

/**
 * Catalog Seeder: Sync src/data/tools/*.json -> Neon Postgres `tools` table
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/migrate-to-sqlite.ts
 *
 * Requires the schema to exist first:  npx drizzle-kit push
 * Uses Neon's pooled HTTP driver — batched INSERT ... ON CONFLICT upserts.
 * Safe to re-run (idempotent).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
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
  return { valid: errors.length === 0, errors };
}

function readToolFiles(): { valid: ToolData[]; invalid: number } {
  const valid: ToolData[] = [];
  let invalid = 0;
  if (!fs.existsSync(TOOLS_DIR)) {
    console.error(`Tools directory not found: ${TOOLS_DIR}`);
    process.exit(1);
  }
  const files = fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, file), 'utf-8'));
      const check = validateTool(raw, file);
      if (!check.valid) {
        console.warn(`[WARN] Skipping ${file}:`, check.errors);
        invalid++;
        continue;
      }
      valid.push(raw);
    } catch (err: any) {
      console.warn(`[WARN] Skipping malformed ${file}: ${err.message}`);
      invalid++;
    }
  }
  return { valid, invalid };
}

async function migrate(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set. Provide a Neon Postgres connection string:');
    console.error('  DATABASE_URL="postgresql://..." npx tsx scripts/migrate-to-sqlite.ts');
    process.exit(1);
  }

  console.log('=== STARTING NEON POSTGRES CATALOG SEED ===');
  const started = Date.now();

  const sql = neon(dbUrl);
  const { valid, invalid } = readToolFiles();
  console.log(`Parsed ${valid.length} valid tools (${invalid} skipped)`);

  const columns = [
    'slug','repo','name','tagline','category','license_spdx','stars','contributors',
    'last_push_days','latest_release','safety_score','verdict','risk_reasons','scorecard',
    'components','language','self_host_difficulty','install_commands','website_url','logo_url',
    'ai_report','ai_report_status','scanned_at','use_cases','how_to_use','requirements',
    'audience','who_for','momentum','cves','permission_model','incident_history',
    'unlisted','archived','advisories_count','provenance','scanned_at_formatted',
    'advisories_source','epss_score','osv_advisories','created_at','updated_at',
  ];

  const upserted = new Set<string>();

  // neon-http driver: batch queries in a transaction per chunk
  const CHUNK = 10;
  for (let i = 0; i < valid.length; i += CHUNK) {
    const chunk = valid.slice(i, i + CHUNK);
    const queries = chunk.map((tool) => {
      upserted.add(tool.slug);
      const row = columns.map((col) => {
        const v = (tool as any)[col];
        if (v === undefined) {
          if (col === 'ai_report_status') return 'approved';
          if (col === 'unlisted' || col === 'archived') return false;
          if (col === 'advisories_count') return 0;
          return null;
        }
        return v;
      });
      // Use query() array form for dynamic columns
      return sql.query(
        `INSERT INTO tools (${columns.map((c) => `"${c}"`).join(',')})
         VALUES (${columns.map((_, idx) => `$${idx + 1}`).join(',')})
         ON CONFLICT (slug) DO UPDATE SET ${columns
           .filter((c) => c !== 'slug' && c !== 'created_at')
           .map((c) => `"${c}" = EXCLUDED."${c}"`)
           .join(',')}`,
        row
      );
    });
    await sql.transaction(queries);
    console.log(`  seeded ${Math.min(i + CHUNK, valid.length)}/${valid.length}`);
  }

  // Mirror audit history if present
  if (fs.existsSync(AUDIT_FILE)) {
    const lines = fs.readFileSync(AUDIT_FILE, 'utf-8').split('\n').filter((l) => l.trim());
    let auditCount = 0;
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        await sql.query(
          `INSERT INTO audit_logs (id, timestamp, principal, action, target_repo, ip, diff, status, details)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO NOTHING`,
          [e.id, e.timestamp || e.at, e.principal || e.who, e.action, e.target || e.target_repo || null, e.ip || '0.0.0.0', e.diff || null, e.status || 'success', e.details || null]
        );
        auditCount++;
      } catch {
        // skip malformed lines
      }
    }
    console.log(`Audit logs seeded: ${auditCount}`);
  }

  console.log('==========================================');
  console.log(`✓ Tools Seeded:       ${upserted.size} (Skipped: ${invalid})`);
  console.log(`✓ Transaction Time:   ${Date.now() - started}ms`);
  console.log('✓ Target:             Neon Postgres (DATABASE_URL)');
  console.log('==========================================');
}

migrate().catch((err) => {
  console.error('MIGRATION FAILED:', err.message);
  process.exit(1);
});
