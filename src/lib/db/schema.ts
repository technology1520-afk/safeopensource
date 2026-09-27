import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import type {
  Verdict,
  ScoreComponents,
  InstallCommands,
  ToolRequirements,
  HowToUseStep,
  ToolAudience,
  ToolMomentum,
  ToolCve,
  AgentPermissionModel,
  AgentIncident,
} from '../../types/tool';

/**
 * Tools Table: Complete repository profiles, computed security scores,
 * component breakdowns, and operational status flags.
 */
export const tools = sqliteTable('tools', {
  slug: text('slug').primaryKey(),
  repo: text('repo').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline').notNull(),
  category: text('category').notNull(),
  license_spdx: text('license_spdx').notNull(),
  stars: integer('stars').notNull(),
  contributors: integer('contributors').notNull(),
  last_push_days: integer('last_push_days').notNull(),
  latest_release: text('latest_release').notNull(),
  safety_score: real('safety_score').notNull(),
  verdict: text('verdict').$type<Verdict>().notNull(),
  risk_reasons: text('risk_reasons', { mode: 'json' }).$type<string[]>().notNull(),
  scorecard: real('scorecard'),
  components: text('components', { mode: 'json' }).$type<ScoreComponents>().notNull(),
  language: text('language').notNull(),
  self_host_difficulty: text('self_host_difficulty').notNull(),
  install_commands: text('install_commands', { mode: 'json' }).$type<InstallCommands>().notNull(),
  website_url: text('website_url'),
  logo_url: text('logo_url'),
  ai_report: text('ai_report').notNull(),
  ai_report_status: text('ai_report_status').$type<'draft' | 'approved'>().notNull().default('approved'),
  scanned_at: text('scanned_at').notNull(),
  use_cases: text('use_cases', { mode: 'json' }).$type<string[]>(),
  how_to_use: text('how_to_use', { mode: 'json' }).$type<HowToUseStep[]>(),
  requirements: text('requirements', { mode: 'json' }).$type<ToolRequirements>(),
  audience: text('audience', { mode: 'json' }).$type<ToolAudience>(),
  who_for: text('who_for', { mode: 'json' }).$type<any>(),
  momentum: text('momentum', { mode: 'json' }).$type<ToolMomentum>(),
  cves: text('cves', { mode: 'json' }).$type<ToolCve[]>(),
  permission_model: text('permission_model', { mode: 'json' }).$type<AgentPermissionModel>(),
  incident_history: text('incident_history', { mode: 'json' }).$type<AgentIncident[]>(),
  unlisted: integer('unlisted', { mode: 'boolean' }).notNull().default(false),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  advisories_count: integer('advisories_count').notNull().default(0),
  provenance: text('provenance'),
  scanned_at_formatted: text('scanned_at_formatted'),
  advisories_source: text('advisories_source'),
  epss_score: real('epss_score'),
  osv_advisories: text('osv_advisories', { mode: 'json' }).$type<any[]>(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

/**
 * Audit Logs Table: Append-only ledger recording every privileged operator
 * login, autonomous agent mutation, catalog review, and security event.
 */
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  principal: text('principal').notNull(), // 'owner' | 'agent' | 'anonymous' or specific operator email/key prefix
  action: text('action').notNull(),       // e.g., 'TOOL_PATCH', 'TOOL_ADD', 'TOOL_APPROVE', 'LOGIN_SUCCESS'
  target_repo: text('target_repo'),       // Target tool slug or repo name
  ip: text('ip').notNull(),
  diff: text('diff', { mode: 'json' }).$type<any>(),
  status: text('status').$type<'success' | 'failure'>().notNull().default('success'),
  details: text('details', { mode: 'json' }).$type<Record<string, any>>(),
});

/**
 * Scan Jobs Table: Queue and state tracker for on-demand repository security scans.
 */
export const scanJobs = sqliteTable('scan_jobs', {
  id: text('id').primaryKey(),
  repo_url: text('repo_url').notNull(),
  status: text('status').$type<'queued' | 'running' | 'completed' | 'failed'>().notNull().default('queued'),
  priority: integer('priority').notNull().default(0),
  created_at: text('created_at').notNull(),
  finished_at: text('finished_at'),
  error: text('error'),
  result: text('result', { mode: 'json' }).$type<any>(),
});

export type ToolEntity = typeof tools.$inferSelect;
export type NewToolEntity = typeof tools.$inferInsert;
export type AuditLogEntity = typeof auditLogs.$inferSelect;
export type NewAuditLogEntity = typeof auditLogs.$inferInsert;
export type ScanJobEntity = typeof scanJobs.$inferSelect;
export type NewScanJobEntity = typeof scanJobs.$inferInsert;
