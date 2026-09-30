# SafeOpenSource (safeopensource.org) — Complete Architectural Specification & Agent Operational Dossier

---

> **Note for AI Coding Agents & System Operators**:
> This document is the canonical architectural and operational reference for the **SafeOpenSource** codebase. Any autonomous agent or human developer working on this repository MUST read and adhere to the architectural invariants, security rules, data schemas, and mathematical scoring constraints described herein.

---

## 1. Executive Summary & Core Mission

**SafeOpenSource** (`safeopensource.org`) is an open-source security intelligence platform, continuous software directory, and live **Security Operations Center (SOC)** console. It continuously inspects, audits, and scores open-source software, self-hosted applications, and developer libraries using an objective, deterministic **0–100 Safety Score**.

### 1.1 Core Value Proposition: Uncompromising Trust & Verifiable Telemetry
Generic software catalogs rank software based on superficial metrics like GitHub star counts, download popularity, or vendor marketing claims. **SafeOpenSource is designed around verifiable risk telemetry**:
- **Mathematical Transparency**: Every score is accompanied by its exact mathematical derivation, component weights, data source attribution, and precise UTC scan timestamp.
- **Defensive Invariants**: Critical vulnerabilities and weaponized exploit probabilities trigger immediate defensive overrides. A project cannot receive a "Safe" / "Healthy" verdict if it harbors known active Critical CVEs or high real-world exploit probability.
- **Vulnerability Intelligence (OSV.dev & FIRST.org EPSS)**: Integrates continuous package-level vulnerability discovery (via Google's OSV.dev) with real-world exploit prediction probability (via FIRST.org Exploit Prediction Scoring System).
- **Embedded Zero-Lock Database (Drizzle ORM & SQLite WAL)**: Zero-lock, concurrent-read database architecture using Better-SQLite3 in Write-Ahead Logging (WAL) mode with Drizzle ORM schemas.
- **Remote Model Context Protocol (MCP) Control Plane**: Full Server-Sent Events (SSE) and stdio MCP server implementation compliant with `@modelcontextprotocol/sdk` (v1.30+), allowing autonomous AI agents to query status, inspect audit logs, and trigger rescans.
- **Standalone Developer CLI (`@safeopensource/cli`)**: Zero-dependency command-line utility located in `packages/cli/` that inspects `package.json`, `requirements.txt`, and `go.mod` manifests in CI/CD pipelines.
- **AI Agent Security Profiles**: Specific risk evaluation criteria for autonomous coding agents and LLM tooling (Docker sandboxing, credential exfiltration protection, filesystem isolation, prompt injection history).
- **Stealth / Zero-Trust Admin Plane**: High-security management portal (`/admin`) protected by Stealth 404 reconnaissance immunity, dual-principal authentication (Argon2id + 2FA for humans, constant-time Bearer tokens for AI agents), sliding-window rate limiting, and CSRF enforcement.

---

## 2. Technology Stack & Design System

### 2.1 Core Framework & Runtime
| Component | Technology | Version | Role in Architecture |
| :--- | :--- | :--- | :--- |
| **Framework** | [Astro](https://astro.build/) | `^7.3.3` (Astro 5+) | Hybrid static & dynamic SSR engine. Prerenders catalog pages while serving live APIs. |
| **SSR Adapter** | `@astrojs/node` | `^11.1.6` | Standalone Node.js server adapter (`mode: 'standalone'`) for dynamic scan and admin APIs. |
| **Persistence** | [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3) | `^13.0.3` | Embedded, zero-latency database operating in Write-Ahead Logging (WAL) mode. |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) | `^0.45.3` | Type-safe SQL schema definitions, migrations, and typed query execution. |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `^6.0.3` | Strict type checking across components, pipeline, APIs, and CLI tooling. |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | `^4.3.3` | Utility-first CSS via `@tailwindcss/vite` integration; zero legacy CSS configs. |
| **Client Islands**| [Preact](https://preactjs.com/) | `^10.29.8` | Ultra-lightweight reactive client islands (`@astrojs/preact` `^6.0.5`) for search modals. |
| **Fuzzy Search** | [Fuse.js](https://www.fusejs.io/) | `^7.5.0` | Client-side zero-latency fuzzy indexing across tools, categories, and natural user intents. |
| **Cryptography** | `@node-rs/argon2` | `^2.2.1` | Hardware-hardened password hashing (Argon2id) for administrative authentication. |
| **Native Crypto**| Node.js `node:crypto` | Built-in | Constant-time token verification (`timingSafeEqual`), CSRF generation, and session tokens. |
| **Agent Protocol**| `@modelcontextprotocol/sdk`| `^1.30.0` | Official MCP SDK for stdio and remote Server-Sent Events (SSE) AI agent integrations. |
| **Iconography** | `lucide-astro` / `@lucide/astro`| `^0.556.0` | Semantic SVGs used across all components. |

### 2.2 Design System — "Lavender Lab / Dark Data-Forward"
SafeOpenSource rejects retro monospace terminal gimmicks in favor of a credible, production-grade security intelligence aesthetic (comparable to Linear, Snyk, and GitHub Security Advisory):
- **Surface Hierarchy**:
  - Base Background: `--app-bg` (`#0A0B0E`)
  - Elevated Surface: `--app-surface` (`#131519`)
  - Secondary Surface: `--app-surface-2` (`#1A1D24`)
  - Subtle Borders: `--app-border` (`#23262E` / `border-slate-800`)
- **Semantic Status Palette**:
  - **Healthy / Safe (Emerald)**: `#10B981` (WCAG Contrast 5.5:1 on dark surface)
  - **Caution (Amber)**: `#F59E0B` (WCAG Contrast 6.1:1 on dark surface)
  - **Risky (Rose)**: `#EF4444` (WCAG Contrast 4.7:1 on dark surface)
- **Typography Standards**:
  - **Sans-serif (`Inter`, system-ui)**: Used for all primary headlines, body text, form controls, navigation, and badges.
  - **Monospace (`JetBrains Mono`, ui-monospace)**: Reserved strictly for scores, telemetry timestamps, package names, commit hashes, and CLI code snippets.
- **Accessibility & Multi-Modal Indicators**:
  - Invariant: **Color is never used as the sole indicator of health or risk.**
  - Every status badge pairs an explicit text label (`Healthy`, `Caution`, `Risky`) with a distinct semantic icon (Shield Check, Alert Triangle, Octagon Alert) passing WCAG AA/AAA standards.
- **Dual Themes**:
  - **Cosmic Void** (Dark Default): Sleek, deep-space dark palette for low-light operations.
  - **Lavender Lab** (Light Alternative): Clean, crisp laboratory theme with subtle violet undertones.
  - Toggled client-side via `#theme-toggle` with `localStorage` persistence.

---

## 3. Core Scoring Engine & Algorithmic Invariants

All scoring logic is implemented in [`src/lib/scanner/scoring.ts`](src/lib/scanner/scoring.ts) and exported via `compute_safety(inputs)`. This function is the single source of truth across the on-demand scanner, catalog verification cron, and CLI batch endpoints.

### 3.1 0–100 Composite Safety Score Formulation
Every repository is evaluated against four distinct weighted dimensions:

$$\text{Safety Score} = (0.35 \times \text{Security Health}) + (0.30 \times \text{Maintenance}) + (0.20 \times \text{Community}) + (0.15 \times \text{Releases})$$

```
                     ┌────────────────────────────────────────────────────────┐
                     │              0–100 COMPOSITE SAFETY SCORE              │
                     └───────────────────────────┬────────────────────────────┘
                                                 │
            ┌────────────────────┬───────────────┴───────────────┬────────────────────┐
            ▼                    ▼                               ▼                    ▼
     Security Health        Maintenance                      Community             Releases
         (35%)                 (30%)                           (20%)                 (15%)
    - OpenSSF Scorecard   - Days since last push          - Star volume         - Release cadence
    - Active CVE counts   - Issue resolution activity     - Bus factor estimate - SemVer adherence
    - OSV.dev advisories  - Commit continuity             - Contributor count   - Asset hygiene
```

| Component | Standard Weight | AI Agents Weight | Core Metrics Evaluated | Authoritative Data Sources |
| :--- | :---: | :---: | :--- | :--- |
| **Security Health** | **35%** | **55%** | Branch protections, signed commits, pinned CI actions, CodeQL/SAST, binary artifacts, vulnerability reporting policy, package advisories. | OpenSSF Scorecard API, GitHub Security Advisory DB, OSV.dev |
| **Maintenance** | **30%** | **20%** | Days since last commit (`last_push_days`), issue close velocity, commit cadence stability. | GitHub REST & GraphQL API |
| **Community** | **20%** | **15%** | Star counts, active contributor count, organization backing, fork activity. | GitHub Public Metrics |
| **Releases** | **15%** | **10%** | Semantic versioning adherence, changelog availability, release frequency, binary asset verification. | GitHub Releases / Tags |

### 3.2 Component Calculation Rules
1. **Security Health (`security_health`)**:
   - Derived from OpenSSF Scorecard (0–10 scale multiplied by 10).
   - Penalized by active security advisories: $\text{Base} - (\text{AdvisoriesCount} \times 8)$.
   - Clamped to the range $[15, 99]$.
   - If an OpenSSF Scorecard is missing (Scorecard 404), `security_health` is set to `null`.
2. **Maintenance (`maintenance`)**:
   - `last_push_days <= 7`: Score = 95
   - `last_push_days <= 30`: Score = 88
   - `last_push_days <= 90`: Score = 75
   - `last_push_days <= 180`: Score = 55
   - `last_push_days > 180`: Score = 35
   - Archived repository: Score capped at 45.
3. **Community (`community`)**:
   - `stars > 25,000`: Score = 95
   - `stars > 5,000`: Score = 90
   - `stars > 1,000`: Score = 82
   - `stars > 200`: Score = 74
   - `stars <= 200`: Score = 60
4. **Releases (`releases`)**:
   - Projects with structured documentation / wikis and active release tagging: Score = 88.
   - Standard release flow: Score = 78.
   - Archived repository: Score capped at 20.

### 3.3 Scorecard 404 (Unverified) Weight Redistribution
When a project has not enrolled in or generated an OpenSSF Scorecard, `security_health` is `null`. The system proportionally redistributes the weights across the remaining three pillars:

$$\text{Weight}_{\text{Total}} = 0.30 + 0.20 + 0.15 = 0.65$$
$$\text{Safety Score} = \frac{(0.30 \times \text{Maintenance}) + (0.20 \times \text{Community}) + (0.15 \times \text{Releases})}{0.65}$$

- **Maintenance**: $0.30 / 0.65 \approx 46.2\%$
- **Community**: $0.20 / 0.65 \approx 30.8\%$
- **Releases**: $0.15 / 0.65 \approx 23.1\%$
- **Verdict Cap**: Projects with unverified security health are **capped at `caution`** unless every remaining component exceeds 85.
- **Badge**: A mandatory `"No OpenSSF Scorecard available — security practices unverified"` risk reason is attached.

### 3.4 Defensive Invariants & Hard Overrides
The engine enforces several inviolable defensive rules:

1. **EPSS Weaponized Exploitation Risk Gate**:
   - The Exploit Prediction Scoring System (EPSS) measures the likelihood of real-world exploitation within 30 days.
   - **EPSS > 0.60 (>60% exploit probability)**: Triggers an immediate **mandatory `risky` override**, regardless of numerical score. Prefixes risk reasons with: `[DEFENSIVE OVERRIDE] Active weaponized exploitation detected`.
   - **EPSS in [0.20, 0.60] (20% to 60% probability)**: Automatically caps the Safety Score at **60.0** and forces the verdict to `caution`.
2. **Archived Repository Invariant**:
   - Any repository marked as archived by GitHub maintainers is unconditionally forced to `risky`. Maintenance is set to 45 and releases to 20.
3. **Active Critical / High CVE Gate**:
   - Projects with active, unpatched Critical or High CVEs in OSV.dev or GitHub Advisories are strictly prohibited from receiving a `healthy` verdict.
4. **Score Tampering Rejection Invariant (HTTP 422)**:
   - Operators and AI agents are strictly forbidden from manually setting calculated score fields (`safety_score`, `scorecard`, `components`, `verdict`) via admin APIs or MCP tools.
   - Any API or MCP call containing these fields immediately returns **HTTP 422 Unprocessable Entity**.

---

## 4. Database Architecture & Storage Layer

The application operates an embedded SQLite database using **Drizzle ORM** with Better-SQLite3 (`src/lib/db/`).

### 4.1 Persistence Model
- **Primary Source of Truth**: `data/safety-opensource.db` (SQLite 3).
- **WAL Mode**: Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) is activated at startup, guaranteeing concurrent, non-blocking reads while background scan jobs write updates.
- **Bootstrap Catalog**: `src/data/tools/*.json` contains 45 pre-audited, hand-curated tool definitions. On database startup, if the `tools` table is empty, `src/lib/db/index.ts` automatically seeds SQLite from these JSON files.

### 4.2 Drizzle ORM Schema Overview (`src/lib/db/schema.ts`)

#### Table: `tools`
Stores repository profiles, computed security scores, component breakdowns, and operational status flags.
```typescript
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
```

#### Table: `audit_logs`
Append-only ledger recording all privileged human operator logins, autonomous agent mutations, catalog reviews, and security events.
```typescript
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  principal: text('principal').notNull(), // 'owner' | 'agent' | 'anonymous'
  action: text('action').notNull(),       // 'TOOL_PATCH', 'TOOL_ADD', 'LOGIN_SUCCESS', etc.
  target_repo: text('target_repo'),
  ip: text('ip').notNull(),
  diff: text('diff', { mode: 'json' }).$type<any>(),
  status: text('status').$type<'success' | 'failure'>().notNull().default('success'),
  details: text('details', { mode: 'json' }).$type<Record<string, any>>(),
});
```

#### Table: `scan_jobs`
Asynchronous job queue tracker for on-demand repository security scans requested via `/api/scan`.
```typescript
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
```

#### Table: `admin_settings`
Key-value store for dynamic control plane configurations and rotating key grace caches.
```typescript
export const adminSettings = sqliteTable('admin_settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updated_at: text('updated_at').notNull(),
});
```

---

## 5. Complete Directory Map & Repository Anatomy

```
safety-opensource/
├── .env                              # Production secrets & control plane keys (git-ignored)
├── astro.config.mjs                  # Astro configuration (standalone Node adapter + Tailwind)
├── package.json                      # Workspace root scripts & dependencies
├── tsconfig.json                     # TypeScript strict configuration
├── README.md                         # Project overview and quick start guide
├── projectdetail.md                  # This file: authoritative architectural dossier
├── deploy.sh                         # Automated VPS deployment script
├── data/                             # Runtime persistence
│   ├── safety-opensource.db          # Embedded SQLite database (WAL mode)
│   ├── settings.json                 # Fallback control plane settings
│   └── recent-scans.json             # Real verified scan telemetry feed
├── packages/
│   └── cli/                          # Standalone Zero-Dependency CLI (@safeopensource/cli)
│       ├── package.json              # CLI package definition (bin: safeopensource)
│       ├── tsconfig.json             # CLI TypeScript config
│       ├── manifest-parser.ts        # npm, PyPI, and Go manifest auto-detection & parsers
│       ├── index.ts                  # CLI runner, ASCII table, batch API client & policy engine
│       └── dist/                     # Compiled standalone JS binaries
├── public/                           # Static assets (favicons, sitemaps, robots, icons)
├── scripts/                          # Operational & verification scripts
│   ├── gen-admin-secrets.mjs / .ts   # Cryptographic secret & password hash generator
│   ├── mcp-server.js                 # Model Context Protocol stdio JSON-RPC server (local)
│   ├── preview.js                    # Node.js production preview & static fallback server
│   ├── refresh-scores.ts             # Scheduled OpenSSF / GitHub score update pipeline
│   ├── migrate-to-sqlite.ts          # Seed & sync SQLite from src/data/tools/*.json
│   ├── verify-admin.js               # Control plane test suite (auth, CSRF, stealth 404)
│   ├── verify-scanner.js             # On-demand scanner API validation suite
│   ├── verify-scan-accuracy.js       # Ground-truth scoring accuracy verification
│   ├── verify-themes.js              # WCAG AA/AAA contrast and token compliance check
│   ├── verify-ai-agents.js           # AI Agent safety signals and permission models check
│   └── verify-radar-and-cta.js       # Radar geometry, tooltip, and search island check
└── src/
    ├── env.d.ts                      # Astro environment type augmentations
    ├── middleware.ts                 # Security gateway (Stealth 404, rate-limiting, CSRF, auth)
    ├── styles/
    │   └── global.css                # CSS variables, surface hierarchy, theme tokens
    ├── types/
    │   └── tool.ts                   # Strict data models (ToolData, ScoreComponents, ToolCve, etc.)
    ├── utils/
    │   ├── tools.ts                  # Tool data accessors (DB queries with JSON fallback)
    │   └── telemetry.ts              # Radar blips, sector averages, aggregate statistics
    ├── data/
    │   ├── categories.ts             # 14 curated category sector definitions
    │   ├── starter-kits.ts           # 5 architecture blueprints (Private Google Stack, etc.)
    │   ├── intents.ts                # Natural goal search mappings ("replace google drive")
    │   ├── trending.ts               # Trending repos, momentum deltas, sparkline trends
    │   └── tools/*.json              # 45 bootstrap JSON tool profiles
    ├── lib/
    │   ├── db/
    │   │   ├── index.ts              # SQLite connection (WAL mode) & migration seeding
    │   │   └── schema.ts             # Drizzle tables: tools, audit_logs, scan_jobs, admin_settings
    │   ├── admin/
    │   │   ├── auth.ts               # Argon2id verification, TOTP, Bearer tokens, CSRF
    │   │   ├── audit.ts              # Append-only audit logger
    │   │   ├── tools.ts              # Catalog CRUD and queue approval service
    │   │   └── jobs.ts               # Scan job queue management
    │   ├── mcp/
    │   │   └── server.ts             # MCP server factory, SSE transport, 15s keepalive
    │   └── scanner/
    │       ├── scoring.ts            # Canonical compute_safety algorithm & invariants
    │       ├── pipeline.ts           # OSV.dev, OpenSSF, GitHub, and EPSS fetching pipeline
    │       └── rate-limiter.ts       # Sliding-window rate limiters & queue bounds
    ├── components/
    │   ├── Header.astro              # Navigation, search trigger, theme toggle
    │   ├── Footer.astro              # Colophon, legal links, documentation links
    │   ├── HeroSection.astro         # Credible headline, scan bar, popular pills, trust badges
    │   ├── AmbientTelemetryTicker.astro # Single-line horizontal verified audit feed
    │   ├── DetectionRadarHero.astro  # Full-width concentric radar scope + dynamic inspector card
    │   ├── SearchDialog.tsx          # Preact modal island with Fuse.js fuzzy index
    │   ├── CategoryCard.astro        # Sector card with average safety score and tool count
    │   ├── ToolCard.astro            # Ranked repository card with score ring and risk chips
    │   ├── BentoRow.astro            # Architectural bento grid layout
    │   ├── CategoryRadar.astro       # Category-specific defense radar
    │   ├── FlagWall.astro            # Critical vulnerability incident display
    │   ├── MatchQuiz.astro           # Interactive recommendation quiz
    │   ├── RiskList.astro            # Expandable risk reasons list
    │   ├── ScoreBar.astro            # Multi-segment progress bar for score components
    │   ├── ScoreRing.astro           # SVG circular score indicator
    │   ├── StackBundles.astro        # Multi-tool starter kit preview card
    │   ├── TopRepos.astro            # Leaderboard table
    │   ├── TrendingRepos.astro       # Momentum and score delta table
    │   ├── TrustBand.astro           # Social proof and methodology trust strip
    │   ├── VerdictBadge.astro        # Multi-modal status badge (Healthy / Caution / Risky)
    │   └── admin/                    # Admin UI components (sidebar, modal, tables)
    └── pages/
        ├── index.astro               # Homepage (Hero, Ticker, Radar, Categories, Leaderboards)
        ├── scan.astro                # On-demand repository safety scan interface
        ├── how-we-score.astro        # Mathematical scoring methodology & derivation guide
        ├── how-to-run-an-ai-agent-safely.astro # Autonomous agent security runbook
        ├── starter-kits/index.astro  # Blueprint stacks (Private Google Stack, etc.)
        ├── categories/[slug].astro   # Sector directory with ranked tools
        ├── tools/[slug].astro        # In-depth single tool evaluation dossier
        ├── alternatives/[pair].astro # Head-to-head comparison pages (e.g. jellyfin-vs-plex)
        ├── top/                      # Curated leaderboards (most-starred, beginners)
        ├── trending/                 # Drift trackers (score-drops, new-entrants)
        ├── badge/[owner]/[repo].ts   # Dynamic SVG safety score shield for GitHub READMEs
        ├── 404.astro                 # Custom public 404 error page
        ├── robots.txt.ts             # Dynamic robots.txt (excludes /admin)
        ├── api/
        │   ├── scan-status.ts        # Public queue telemetry metrics
        │   ├── scan/
        │   │   ├── index.ts          # POST: submit repo for on-demand scan
        │   │   ├── [id].ts           # GET: poll scan job progress
        │   │   └── batch.ts          # POST: batch dependency lookup for CLI/CI
        │   └── mcp/
        │       ├── sse.ts            # GET: Server-Sent Events stream for remote AI agents
        │       └── messages.ts       # POST: JSON-RPC message delivery with 422 tamper guard
        └── admin/                    # Restricted control plane (behind Stealth 404)
            ├── login.astro           # Operator authentication portal
            ├── index.astro           # Administrative mission control dashboard
            ├── queue.astro           # Unlisted tool review and approval queue
            ├── tools.astro           # Catalog editor and metadata management
            ├── scans.astro           # Live scan job monitor
            ├── audit.astro           # Append-only audit trail viewer
            ├── settings.astro        # Key management, rotation, and security settings
            └── api/                  # Privileged admin REST endpoints
```

---

## 6. High-Security Control Plane (`/admin`)

The platform features an isolated administrative control plane engineered specifically for two authorized principals: **Human Operators** and **Autonomous AI Agents**.

```
                        INCOMING HTTP REQUEST
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      src/middleware.ts       │
                    └──────────────┬───────────────┘
                                   │
                        Path starts with /admin?
                                   ├── No ─────────► Continue Public Pipeline
                                   │
                                  Yes
                                   │
                        Path is /admin/login?
                                   ├── Yes ────────► Render Gateway Form (200 OK)
                                   │
                                   No
                                   │
                    ┌──────────────────────────────┐
                    │   Authenticate Request       │
                    │  - Session Cookie (Argon2id) │
                    │  - Bearer Token (256-bit API)│
                    └──────────────┬───────────────┘
                                   │
                         Valid Principal?
                                   ├── No ─────────► [STEALTH 404] Empty Body
                                   │
                                  Yes
                                   │
                         Rate-Limit Checked?
                                   ├── >5 fails ───► HTTP 429 Too Many Requests
                                   │
                                  Pass
                                   │
                         Mutating (POST/PATCH)?
                                   ├── Yes ────────► Verify CSRF Token (Human)
                                   │                 Verify Non-Readonly (Agent)
                                   │
                                  Pass
                                   │
                                   ▼
                      Execute /admin Route Action
```

### 6.1 Hard Security Policies
1. **Stealth 404 (Reconnaissance Immunity)**:
   - Any unauthenticated request to `/admin` or `/admin/api/*` returns **HTTP 404 Not Found with an empty body** (`body.length === 0`).
   - Scanners, port checkers, and unauthorized users receive zero indication that an administrative interface exists.
   - The route is strictly excluded from `robots.txt` and sitemaps.
2. **Dual-Principal Authentication**:
   - **Human Operator**: Authenticates via `/admin/login` using email, Argon2id password hash, and optional 6-digit TOTP 2FA. Sets a rolling 30-minute HTTP-only, `SameSite=Strict` cookie (`sos_session`).
   - **Autonomous AI Agent**: Authenticates via `Authorization: Bearer <API_KEY>` using constant-time cryptographic verification (`crypto.timingSafeEqual`).
3. **Role Segregation & Dual Keys**:
   - `ADMIN_API_KEY`: Full read-write permission (rescan, edit metadata, approve queue, trigger rebuilds).
   - `ADMIN_API_KEY_READONLY`: Monitoring permission. Any mutating request (`POST`, `PATCH`, `DELETE`) is rejected with **HTTP 403 Forbidden**.
4. **Sliding-Window Rate Limiting**:
   - Failed authentication attempts are tracked per IP.
   - Exceeding 5 failures within 60 seconds triggers an immediate **HTTP 429 Too Many Requests** lockout.
5. **CSRF Protection on Mutating Actions**:
   - All mutating requests (`POST`, `PATCH`, `DELETE`) initiated by human sessions require valid CSRF tokens passed via form fields or `X-CSRF-Token` headers.
6. **24-Hour Key Rotation Grace Window**:
   - When an API key is rotated via `/admin/settings`, the retired key is archived in `admin_settings` for exactly 24 hours, preventing abrupt downtime for external automated agents or cron jobs.
7. **Catalog Review Queue Gate**:
   - Newly scanned repositories are automatically enrolled as `unlisted: true`.
   - Unlisted tools return HTTP 404 on the public catalog until vetted and approved by an operator or authorized agent.
8. **Append-Only Audit Trail in SQLite**:
   - Every login attempt, metadata edit, queue approval, and rebuild trigger is logged with timestamp, principal, IP, and diffs to the `audit_logs` table.

---

## 7. Model Context Protocol (MCP) Remote Server

SafeOpenSource provides a dual-interface **Model Context Protocol (MCP)** implementation compliant with `@modelcontextprotocol/sdk` (v1.30+):
1. **Local Stdio Interface (`scripts/mcp-server.js`)**: Operates via standard I/O for local coding environments (Claude Desktop, Cursor).
2. **Remote Cloud Interface (`/api/mcp/sse` & `/api/mcp/messages`)**: Exposes Server-Sent Events (SSE) over HTTPS via `SSEServerTransport`, enabling remote autonomous agents to monitor and operate the platform.

```
┌─────────────────┐       GET /api/mcp/sse (Bearer Auth)        ┌─────────────────────────┐
│ Remote Agent    │ ──────────────────────────────────────────► │ /api/mcp/sse.ts         │
│ (Claude, Codex) │ ◄────────────────────────────────────────── │ SSE Transport Bridge    │
│                 │   event: endpoint (/api/mcp/messages?id)    └────────────┬────────────┘
│                 │   : ping (15s reverse-proxy keepalive)                   │
│                 │                                                          ▼
│                 │       POST /api/mcp/messages (tools/call)   ┌─────────────────────────┐
│                 │ ──────────────────────────────────────────► │ /api/mcp/messages.ts    │
│                 │ ◄────────────────────────────────────────── │ - Bearer Auth Gate      │
│                 │   HTTP 202 Accepted / SSE Tool Result       │ - Two-Tier Permissions  │
└─────────────────┘                                             │ - HTTP 422 Invariant    │
                                                                └─────────────────────────┘
```

### 7.1 Reverse Proxy Keepalive Handling
To prevent intermediate proxies (Caddy, Nginx, AWS ALB) from terminating idle SSE connections, the transport automatically injects SSE comments (`: ping - <timestamp>\n\n`) every 15 seconds along with `X-Accel-Buffering: no` response headers.

### 7.2 Exposed MCP Tools Reference
| Tool Name | Permissions | Description | Arguments |
| :--- | :---: | :--- | :--- |
| `sos_status` | Read & Admin | Returns system health, total monitored tools, flagged count, last sweep timestamp, and queue depth. | None |
| `sos_audit` | Read & Admin | Queries recent chronological audit log entries from SQLite. | `limit?: number` (default: 20) |
| `sos_ping` | Read & Admin | Verifies latency and connectivity across reverse proxies. | None |
| `sos_rescan` | Admin Only | Triggers an immediate OpenSSF, OSV.dev, and EPSS telemetry sweep for one tool or all tools. | `slug?: string` (omitted = all) |
| `sos_add_tool` | Admin Only | Enrolls a new repository into continuous monitoring; lands in queue as unlisted. | `repo: string`, `category: string` |
| `sos_edit_tool`| Admin Only | Updates human-authored fields (taglines, install commands). Calculated score tampering is rejected with 422. | `slug: string`, `fields: object` |
| `sos_approve` | Admin Only | Promotes a tool from the review queue to the public catalog (`unlisted: false`). | `slug: string` |
| `sos_reject` | Admin Only | Rejects and purges a pending submission from the database. | `slug: string`, `reason: string` |
| `sos_rebuild` | Admin Only | Triggers static site rebuild and deployment via `deploy.sh`. | None |

---

## 8. Standalone Zero-Dependency CLI (`@safeopensource/cli`)

Located in [`packages/cli/`](packages/cli/), `@safeopensource/cli` is a standalone, zero-dependency Node.js CLI tool enabling developers and CI/CD pipelines to audit dependencies against SafeOpenSource security intelligence.

### 8.1 Command Syntax & Options
```bash
$ safeopensource audit [options]
```

| Option | Flag | Default | Description |
| :--- | :---: | :---: | :--- |
| `--manifest <path>` | `-m` | Auto-detect | Path to `package.json`, `requirements.txt`, or `go.mod`. |
| `--min-score <num>` | `-s` | `70` | Minimum acceptable Safety Score (0–100). |
| `--fail-on <level>` | `-f` | `risky` | Failure trigger level (`caution`, `risky`, or `cve`). Exits with code 1. |
| `--json` | | `false` | Emits machine-readable JSON for CI/CD integrations. |
| `--api-url <url>` | | `https://safeopensource.org` | Custom SafeOpenSource API server endpoint. |
| `--dev` | | `false` | Include development dependencies (for `package.json`). |
| `--timeout <ms>` | | `15000` | Network request timeout in milliseconds. |

### 8.2 Execution Lifecycle
1. **Manifest Auto-Detection**: Inspects the working directory for `package.json` (npm), `requirements.txt` (PyPI), or `go.mod` (Go).
2. **Batch Querying (`/api/scan/batch`)**: Sends a single optimized batch payload to SafeOpenSource for all primary dependencies.
3. **On-Demand Scan Fallback**: For uncataloged packages, automatically triggers `/api/scan` and polls the queue until analysis is complete.
4. **Visual ASCII Table**: Formats terminal output with ANSI colors, score gauges, verdicts, and license compliance indicators.
5. **Remediation Guide**: On audit failure, prints violation reasons, observed risks, and recommends safer alternatives from `direct_alternatives` with exit code `1`.

---

## 9. Environment Variables & Configuration

The application is configured via environment variables (loaded from `.env` in local development or environment secrets in production):

| Variable | Required | Default | Purpose |
| :--- | :---: | :---: | :--- |
| `ADMIN_EMAIL` | Yes | `admin@safeopensource.org` | Operator login email for `/admin/login`. |
| `ADMIN_PASSWORD_HASH` | Yes | — | Argon2id hash for operator login. Generated via `scripts/gen-admin-secrets.mjs`. |
| `ADMIN_API_KEY` | Yes | — | 256-bit hexadecimal string for full read-write Bearer token access. |
| `ADMIN_API_KEY_READONLY`| Yes | — | 256-bit hexadecimal string for read-only Bearer token access. Mutating calls yield 403. |
| `ADMIN_TOTP_SECRET` | No | — | Optional base32 TOTP secret for two-factor authentication. |
| `GITHUB_TOKEN` | No | — | Optional GitHub Personal Access Token to avoid unauthenticated API rate limits. |
| `SQLITE_DB_PATH` | No | `data/safety-opensource.db`| File path to SQLite database. |
| `PORT` | No | `4321` | HTTP listening port for standalone server. |
| `HOST` | No | `0.0.0.0` | Network host interface. |

---

## 10. Automated Verification & Test Harness Suite

The codebase includes an extensive suite of automated test harnesses in [`scripts/`](scripts/):

| Test Script | Scope Tested | Key Invariants Verified |
| :--- | :--- | :--- |
| `scripts/verify-admin.js` | Control Plane Security | Stealth 404, rate-limiting (429), Argon2id login, CSRF enforcement (403), score tampering prevention (422), review queue gating, MCP stdio calls. |
| `scripts/verify-scanner.js` | On-Demand Scanner API | Rate limits, async queue polling, cache hits, scoring equality against baseline. |
| `scripts/verify-scan-accuracy.js` | Ground-Truth Accuracy | Strict score validation against live reference targets (e.g. Jellyfin, Vaultwarden). |
| `scripts/verify-themes.js` | WCAG & Design Tokens | Zero raw hex codes in components; 100% theme token adoption; WCAG AAA/AA contrast compliance. |
| `scripts/verify-ai-agents.js` | AI Agent Data Signals | Permission models, CVE structures, and runbook definitions for AI tooling. |
| `scripts/verify-radar-and-cta.js` | Radar Scope & Search | SVG radar plotting coordinates, quadrant distribution, search island keyboard triggers. |

To run the verification suite:
```bash
# Verify control plane security & stealth 404
node scripts/verify-admin.js

# Verify scoring engine and ground-truth accuracy
node scripts/verify-scan-accuracy.js

# Verify scanner queue and rate limiting
node scripts/verify-scanner.js

# Verify theme token adoption and WCAG contrast
node scripts/verify-themes.js
```

---

## 11. Operational Playbook & Deployment Guide

### 11.1 NPM Scripts Reference
- `npm run dev`: Starts local Astro development server on `http://localhost:4321`.
- `npm run build`: Compiles production static assets and standalone Node SSR server into `dist/`.
- `npm run preview`: Launches standalone Node server (`scripts/preview.js`) serving dynamic SSR endpoints and static assets.
- `npm run check`: Executes `@astrojs/check` and TypeScript validation.

### 11.2 Production Deployment (Linux VPS + Caddy)
When deploying to production:
1. Run `npm run build` to compile the application.
2. The standalone Node server entrypoint is generated at `dist/server/entry.mjs`.
3. Manage the Node process using systemd or PM2:
   ```bash
   PORT=4321 HOST=127.0.0.1 node dist/server/entry.mjs
   ```
4. Configure **Caddy** as the reverse proxy:
   ```caddyfile
   safeopensource.org {
       reverse_proxy 127.0.0.1:4321 {
           header_up X-Real-IP {remote_host}
           header_up X-Forwarded-For {remote_host}
           header_up X-Forwarded-Proto {scheme}
       }

       # Bypass buffering for SSE streaming endpoints
       @sse path /api/mcp/sse*
       handle @sse {
           reverse_proxy 127.0.0.1:4321 {
               flush_interval -1
           }
       }
   }
   ```

---

## 12. Crucial Guidelines & Gotchas for AI Coding Agents

When tasked with modifying, extending, or debugging this repository, you **MUST** follow these rules:

1. **Never Tamper with Computed Scores**:
   - Calculated fields (`safety_score`, `scorecard`, `components`, `verdict`) must ONLY be computed by `compute_safety()` in `src/lib/scanner/scoring.ts`. Never hardcode or manually override scores in database edits.
2. **Preserve the Stealth 404 Gate**:
   - Do not weaken `src/middleware.ts`. Any unauthenticated request to `/admin` or `/admin/api/*` MUST return an empty HTTP 404 response.
3. **Maintain SQLite WAL Mode**:
   - Never disable WAL mode or delete `data/safety-opensource.db` while the server is running. Always use Drizzle ORM helpers in `src/lib/db/index.ts`.
4. **Adhere to the Dual-Principal Auth Model**:
   - Always verify Bearer tokens with constant-time equality (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
   - Enforce CSRF tokens for all mutating operations performed by human operators.
5. **Respect Design System Tokens**:
   - Do not introduce ad-hoc utility hex codes (e.g. `bg-[#123456]`). Always use the predefined semantic tokens (`--app-bg`, `--app-surface`, `--app-border`, `text-app-text`, `text-app-muted`).
   - Every status indicator must pair an icon with an explicit text label for accessibility.
6. **Keep Reverse Proxy Heartbeats Active**:
   - Never remove the 15-second heartbeat ping in `src/lib/mcp/server.ts`; intermediate proxies will drop long-lived SSE connections without it.
7. **Always Run Verification After Edits**:
   - Run `node scripts/verify-admin.js` and `npm run check` to verify that no TypeScript regressions or security leaks were introduced.
