# SafeOpenSource (safeopensource.org) — Comprehensive Project Specification & Architectural Dossier

---

## 1. Executive Summary & Mission

**SafeOpenSource** (`safeopensource.org`) is an open-source security intelligence platform, repository directory, and live Security Operations Center (SOC) console. It evaluates open-source software and developer libraries with a **0–100 Safety Score**, automated vulnerability telemetry, license commercial-use analysis, and AI-generated repository audit dossiers.

### Core Value Proposition & Differentiator: Uncompromising Trust
Unlike generic software directories that rank tools purely by popularity (GitHub stars) or marketing copy, **SafeOpenSource is built around verifiable risk telemetry**:
- **Mathematical Transparency**: Every score is paired with its full component breakdown, weight derivation, data source provenance, and scan timestamp.
- **Defensive Invariants**: Tools with known active Critical/High CVEs or weaponized exploit probability (EPSS > 0.60) are strictly prohibited from receiving a "Safe" / "Healthy" verdict, regardless of numerical metrics.
- **Vulnerability Intelligence (OSV.dev & FIRST.org EPSS)**: Continuous package-level CVE discovery across npm, PyPI, Crates.io, and Go modules, combined with real-world exploit prediction probability.
- **Embedded Zero-Lock Database (Drizzle ORM & SQLite WAL)**: Enterprise-grade concurrency eliminating write locks and race conditions during high-throughput scans and admin operations.
- **Remote MCP Control Plane**: Full Server-Sent Events (SSE) Model Context Protocol endpoint for autonomous AI agents behind constant-time Bearer token gating and two-tier permissions.
- **Zero-Dependency CLI Tooling**: Standalone developer CLI (`@safeopensource/cli`) to audit `package.json`, `requirements.txt`, and `go.mod` dependencies in CI/CD pipelines.
- **AI Agent Security Profiles**: Specific evaluation criteria for autonomous coding agents and LLM tooling (sandboxing, permission models, egress filtering, prompt injection history).
- **Stealth / Zero-Trust Admin Plane**: High-security operational interface for human administrators and autonomous AI agents with zero public reconnaissance footprint.

---

## 2. Technology Stack & Design System

### 2.1 Core Framework & Libraries
- **Static & SSR Hybrid Framework**: [Astro 5](https://astro.build/) (`astro` ^7.3.3) configured with static output generation and `@astrojs/node` standalone adapter for dynamic admin control plane, remote MCP SSE endpoints, and on-demand repository scanning.
- **Embedded Database & Persistence**: [Drizzle ORM](https://orm.drizzle.team/) (`drizzle-orm` ^0.45.3) paired with [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (`better-sqlite3` ^13.0.3) in Write-Ahead Logging (WAL) mode. Eliminates write locks and race conditions during concurrent scans and admin operations.
- **Type Safety**: TypeScript 6.0 in strict mode with comprehensive interface definitions (`src/types/tool.ts`).
- **Styling & CSS Architecture**: Tailwind CSS 4 (`tailwindcss` ^4.3.3 + `@tailwindcss/vite`), built on custom CSS token variables defined in `src/styles/global.css`.
- **Search Island**: [Preact](https://preactjs.com/) (`preact` ^10.29.8, `@astrojs/preact` ^6.0.5) powering an ultra-responsive client-side modal search island (`SearchDialog.tsx`) with [Fuse.js](https://www.fusejs.io/) fuzzy matching.
- **Cryptography & Security**:
  - `@node-rs/argon2` for password hashing on the operator login gateway.
  - Native Node.js `crypto` for timing-safe 256-bit token comparisons (`crypto.timingSafeEqual`) and CSRF tokens.
- **AI / Agent Protocols**: Official Model Context Protocol SDK (`@modelcontextprotocol/sdk` ^1.30.0) exposing both local stdio tools and remote HTTPS Server-Sent Events (SSE) transports.
- **CLI Ecosystem**: Zero-dependency standalone CLI (`packages/cli/`) packaged as `@safeopensource/cli`.
- **Icons**: Lucide icons via `lucide-astro` and `@lucide/astro`.

### 2.2 Design System — "Lavender Lab / Dark Data-Forward"
The UI follows a modern cybersecurity operations aesthetic inspired by Linear and Vercel:
- **Palette**: Dark, high-contrast surface hierarchy (`--bg: #0A0B0E`, `--surface: #131519`, `--surface-2: #1A1D24`, `--border: #23262E`).
- **Status Semantics**:
  - **Healthy / Safe (Emerald)**: `#10B981` (WCAG Contrast 5.5:1 on surface)
  - **Caution (Amber)**: `#F59E0B` (WCAG Contrast 6.1:1 on surface)
  - **Risky (Rose)**: `#EF4444` (WCAG Contrast 4.7:1 on surface)
- **Typography**: `Inter` for interfaces, paired with `JetBrains Mono` for scores, hashes, terminal commands, and telemetry timestamps.
- **Accessibility Invariant**: Scores and risk verdicts are **never conveyed by color alone**. Every status indicator pairs a semantic SVG icon with an explicit text label ("Healthy", "Caution", "Risky") passing WCAG AAA/AA requirements.

---

## 3. Core Scoring Engine & Algorithmic Invariants

### 3.1 0–100 Composite Safety Score Formulation
Every repository is evaluated against four distinct weighted pillars:

$$\text{Safety Score} = (0.35 \times \text{Security Health}) + (0.30 \times \text{Maintenance}) + (0.20 \times \text{Community}) + (0.15 \times \text{Releases})$$

| Component | Weight | Key Metrics Evaluated | Data Sources |
| :--- | :---: | :--- | :--- |
| **Security Health** | **35%** | Branch protection rules, signed commits, pinned dependencies, SAST scanning (CodeQL), binary artifacts, vulnerability reporting policy, package-level advisories. | OpenSSF Scorecard API, GitHub Security Advisories, OSV.dev |
| **Maintenance** | **30%** | Days since last commit (`last_push_days`), issue close ratios, release frequency, commit cadence stability. | GitHub REST / GraphQL API |
| **Community** | **20%** | Star count, active contributor diversity (bus factor estimation), organization sponsorship, fork activity. | GitHub Public Metrics |
| **Releases** | **15%** | Semantic versioning adherence, changelog availability, release frequency, release asset verification. | GitHub Releases / Tags |

### 3.2 EPSS Risk Gate Invariant & Defensive Overrides
1. **EPSS Weaponized Exploitation Risk Gate**:
   - The Exploit Prediction Scoring System (EPSS) estimates the probability that a software vulnerability will be exploited in the wild.
   - **EPSS > 0.60 (>60% probability of active exploitation)**: Triggers a **mandatory defensive override** forcing the verdict to `Risky`, regardless of numerical composite score. Injects `[DEFENSIVE OVERRIDE] Active weaponized exploitation detected`.
   - **EPSS in [0.20, 0.60] (20% to 60% probability)**: Caps the maximum possible Safety Score at **60.0** and forces the verdict to `Caution`.
2. **Unverified Scorecard Handling**: If an open-source project lacks an OpenSSF Scorecard, `security_health` is set to `null`, a prominent `"Security practices UNVERIFIED"` badge is applied, and the remaining 3 components are proportionally re-weighted.
3. **Active Critical/High CVE Defensive Override**: If a project has $>0$ active Critical or High CVEs / GHSA advisories, the system refuses to output a `Safe` / `Healthy` verdict, overriding the display to `Caution` or `Risky`.
4. **Score Tampering Rejection**: Through `/admin/api/tools/[repo]`, `/api/mcp/messages`, or MCP tool execution, human operators and AI agents are prohibited from modifying calculated score fields (`safety_score`, `scorecard`, `components`, `verdict`). Any attempt immediately returns **HTTP 422 Unprocessable Entity**.

---

## 4. Database Architecture & Storage Layer (SQLite + Drizzle ORM)

All tool definitions, scan jobs, settings, and audit trails are managed via an embedded SQLite database (`data/safety-opensource.db`) using **Drizzle ORM** (`src/lib/db/schema.ts`). Write-Ahead Logging (WAL) mode enables concurrent reads without write starvation:

```
┌─────────────────────────────────────────────────────────────┐
│                 data/safety-opensource.db                   │
├──────────────────────────────┬──────────────────────────────┤
│            tools             │          audit_logs          │
├──────────────────────────────┼──────────────────────────────┤
│ slug (PK: text)              │ id (PK: text)                │
│ repo (text, unique)          │ timestamp (text)             │
│ name, tagline, category      │ principal (owner/agent/anon) │
│ safety_score (real)          │ action (text)                │
│ verdict (healthy/caution/risk│ target_repo (text)           │
│ components (json)            │ ip (text)                    │
│ scorecard (real)             │ diff (json)                  │
│ epss_score (real)            │ status (success/failure)     │
│ osv_advisories (json)        │ details (json)               │
│ cves (json), unlisted (bool) ├──────────────────────────────┤
├──────────────────────────────┤          scan_jobs           │
│        admin_settings        ├──────────────────────────────┤
├──────────────────────────────┤ id (PK: text)                │
│ key (PK: text)               │ repo_url (text)              │
│ value (json)                 │ status (queued/running/etc.) │
│ updated_at (text)            │ priority (int), stages (json)│
└──────────────────────────────┴──────────────────────────────┘
```

---

## 5. Repository Structure & Directory Map

```
safety-opensource/
├── .env                              # Production credentials & API tokens (git-ignored)
├── astro.config.mjs                  # Astro configuration (standalone Node adapter + Tailwind Vite)
├── package.json                      # Workspace root scripts & dependencies
├── tsconfig.json                     # TypeScript strict compiler config
├── README.md                         # Quick start, deployment guide, and control plane summary
├── projectdetail.md                  # This file: full architecture & specification dossier
├── deploy.sh                         # Automated VPS deployment script
├── data/                             # SQLite database & runtime data
│   ├── safety-opensource.db          # Embedded SQLite database (WAL mode)
│   └── settings.json                 # Dynamic control plane settings & rotating key cache
├── packages/
│   └── cli/                          # Standalone Zero-Dependency CLI (@safeopensource/cli)
│       ├── package.json              # CLI package definition (bin: safeopensource)
│       ├── tsconfig.json             # CLI TypeScript config
│       ├── manifest-parser.ts        # npm, PyPI, and Go manifest auto-detection & parsers
│       ├── index.ts                  # CLI runner, ASCII table, batch API client & policy engine
│       └── dist/                     # Compiled standalone JS binaries
├── public/                           # Static assets (favicons, sitemaps, open-graph assets)
├── scripts/                          # Operational, testing, and verification scripts
│   ├── gen-admin-secrets.mjs / .ts   # Cryptographic secret & password hash generator
│   ├── mcp-server.js                 # Model Context Protocol stdio JSON-RPC server (local)
│   ├── preview.js                    # Node.js production preview & static fallback server
│   ├── refresh-scores.ts             # Scheduled OpenSSF / GitHub score update pipeline
│   └── verify-admin.js               # Control plane test suite (auth, CSRF, stealth 404, rate-limits)
└── src/
    ├── env.d.ts                      # TypeScript Astro environment types
    ├── middleware.ts                 # Security gateway (Stealth 404, rate-limiting, CSRF, auth)
    ├── styles/                       # Global CSS & theme tokens
    ├── types/
    │   └── tool.ts                   # Strict data models (ToolData, CVEs, OsvAdvisory, EPSS, etc.)
    ├── utils/                        # Tool data helpers, licenses matrix, telemetry
    ├── lib/
    │   ├── db/                       # Drizzle ORM schema, SQLite connection, runtime migrations
    │   │   ├── index.ts              # SQLite connection (WAL mode) & migration fallbacks
    │   │   └── schema.ts             # Drizzle tables: tools, audit_logs, scan_jobs, admin_settings
    │   ├── admin/                    # Auth, audit logging, job queues, tools service
    │   ├── mcp/                      # Model Context Protocol Server Core
    │   │   └── server.ts             # MCP Server factory, SSEServerTransport adapter, 15s keepalive
    │   └── scanner/
    │       ├── pipeline.ts           # OSV.dev, FIRST.org EPSS, and GitHub scanning pipeline
    │       ├── rate-limiter.ts       # Sliding-window rate limiters & queue depths
    │       └── scoring.ts            # Scoring algorithms & EPSS Risk Gate invariant
    ├── components/                   # Astro UI components, Radar hero, search island
    └── pages/
        ├── index.astro               # Homepage (Radar hero, telemetry cards, flag wall)
        ├── scan.astro                # On-demand repository safety scanner UI
        ├── how-we-score.astro        # Complete scoring methodology & mathematical formulas
        ├── how-to-run-an-ai-agent-safely.astro # Deep-dive operational guide for AI agents
        ├── tools/[slug].astro        # In-depth single tool evaluation dossier
        ├── categories/[slug].astro   # Category indexes with curated editorial overviews
        ├── alternatives/[a]-vs-[b].astro # Head-to-head comparison pages
        ├── api/                      # Public & Agent APIs
        │   ├── scan-status.ts        # Public scan queue telemetry
        │   ├── scan/
        │   │   ├── index.ts          # On-demand scan submission
        │   │   ├── [id].ts           # Scan job status polling
        │   │   └── batch.ts          # Dedicated batch dependency lookup for CLI/CI
        │   └── mcp/                  # Remote Model Context Protocol Endpoints
        │       ├── sse.ts            # GET: Server-Sent Events stream for remote agents
        │       └── messages.ts       # POST: JSON-RPC message delivery with 422 gate
        └── admin/                    # Control Plane (Behind Stealth 404 & Dual Auth Gate)
```

---

## 6. High-Security Control Plane (`/admin`)

The platform includes a dedicated, restricted Control Plane engineered specifically for two authorized principals: **Human Operators** and **Autonomous AI Agents**.

```
                        INCOMING HTTP REQUEST
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │       src/middleware.ts       │
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
                                  ├── No ─────────► [STEALTH 404] Empty Response
                                  │
                                 Yes
                                  │
                        Rate-Limit Checked?
                                  ├── >5 fails ───► HTTP 429 Too Many Requests
                                  │
                                 Pass
                                  │
                        Mutating (POST/PATCH)?
                                  ├── Yes ────────► Verify CSRF Token (Owner)
                                  │                 Verify Non-Readonly (Agent)
                                  │
                                 Pass
                                  │
                                  ▼
                     Execute /admin Route Action
```

### 6.1 Hard Security Policies
1. **Stealth 404 (Reconnaissance Immunity)**:
   - Unauthenticated requests to `/admin` or `/admin/api/*` return **HTTP 404 Not Found with an empty body** (`body.length === 0`).
   - Automated scanners, port checkers, and unauthorized visitors receive zero evidence that an administrative portal exists.
   - The route is strictly excluded from `robots.txt` and `sitemap-index.xml`.
2. **Dual-Principal Authentication**:
   - **Human Operator**: Authenticates via `/admin/login` using email, Argon2id-hashed password, and optional 6-digit TOTP 2FA. Sets a rolling 30-minute HTTP-only, `SameSite=Strict` cookie (`sos_session`).
   - **Autonomous AI Agent**: Authenticates programmatically via `Authorization: Bearer <API_KEY>` using constant-time cryptographic verification (`crypto.timingSafeEqual`).
3. **Role Segregation & Dual Keys**:
   - `ADMIN_API_KEY`: Full read-write permission (rescan, edit metadata, approve queue, trigger rebuilds).
   - `ADMIN_API_KEY_READONLY`: Monitoring permission. Any mutating request (`POST`, `PATCH`, `DELETE`) is rejected with **HTTP 403 Forbidden**.
4. **Sliding-Window Rate Limiting**:
   - Tracks failed authentication attempts per IP.
   - Exceeding 5 failures within 60 seconds triggers an immediate **HTTP 429 Too Many Requests** lockout.
5. **CSRF Protection on All Mutating Actions**:
   - Mutating requests initiated by human sessions require valid CSRF tokens passed via form parameters or `X-CSRF-Token` headers.
6. **24-Hour Key Rotation Grace Window**:
   - Rotating an API key archives the retired key in SQLite settings for exactly 24 hours, preventing abrupt downtime for external automated agents or cron jobs.
7. **Queue Gate**:
   - Community-submitted or scanner-enrolled tools land in the database as `unlisted: true`.
   - Unapproved tools return HTTP 404 on the public catalog until vetted and approved by an operator or authorized agent.
8. **Append-Only Audit Trail in SQLite**:
   - Every login attempt, metadata edit, queue approval, and rebuild trigger is logged with timestamp, principal, IP, and diffs to the `audit_logs` table.

---

## 7. Model Context Protocol (MCP) Remote Server (SSE & Stdio)

SafeOpenSource provides a dual-interface **Model Context Protocol (MCP)** implementation compliant with `@modelcontextprotocol/sdk` (v1.30+):
1. **Local CLI Interface (`scripts/mcp-server.js`)**: Operates via standard I/O (`stdio`) for local coding environments like Cursor and Claude Desktop.
2. **Remote Cloud Interface (`/api/mcp/sse` and `/api/mcp/messages`)**: Exposes Server-Sent Events (SSE) over HTTPS via `SSEServerTransport`, enabling remote autonomous agents to monitor and operate the platform securely.

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

### 7.1 Two-Tier Permission Model
- **Read-Only Token (`ADMIN_API_KEY_READONLY`)**: Only registers and permits read commands: `sos_status`, `sos_audit`, and `sos_ping`. Any call to mutating tools returns **HTTP 403 Forbidden**.
- **Full Key (`ADMIN_API_KEY`)**: Grants full execution access to mutating tools (`sos_rescan`, `sos_add_tool`, `sos_edit_tool`, `sos_approve`, `sos_reject`, `sos_rebuild`).

### 7.2 HTTP 422 Score Tampering Defensive Invariant
Any JSON-RPC call (`sos_edit_tool` or `sos_update_content`) attempting to overwrite pipeline-calculated scores (`safety_score`, `scorecard`, `components`, `verdict`) is rejected immediately with an **HTTP 422 Unprocessable Entity** response.

### 7.3 Caddy & Reverse Proxy Keepalive Handling
To prevent intermediate proxies (Caddy, Nginx, AWS ALB) from terminating idle SSE connections, the transport automatically injects SSE comments (`: ping - <timestamp>\n\n`) every 15 seconds along with `X-Accel-Buffering: no` response headers.

### Exposed MCP Tools
| MCP Tool Name | Permissions | Description |
| :--- | :---: | :--- |
| `sos_status` | Read & Admin | Returns pipeline health, tool counts (listed/unlisted/flagged), last audit sweep, and queue status. |
| `sos_audit` | Read & Admin | Queries recent chronological audit log entries with optional limit. |
| `sos_ping` | Read & Admin | Connectivity and latency verification across reverse proxies. |
| `sos_rescan` | Admin Only | Triggers immediate OpenSSF Scorecard, OSV.dev, and EPSS telemetry sweep for one or all tools. |
| `sos_add_tool` | Admin Only | Enrolls a new repository into continuous monitoring; places it in review queue as unlisted. |
| `sos_edit_tool`| Admin Only | Updates human-authored fields (taglines, install commands). Score tampering is rejected with 422. |
| `sos_approve` | Admin Only | Promotes a tool from review queue to public catalog. |
| `sos_reject` | Admin Only | Rejects and purges a pending submission. |
| `sos_rebuild` | Admin Only | Triggers static site rebuild and deployment via `deploy.sh`. |

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

### 8.2 Execution Lifecycle
1. **Manifest Auto-Detection**: Inspects the working directory for `package.json` (npm), `requirements.txt` (PyPI), or `go.mod` (Go).
2. **Batch Querying (`/api/scan/batch`)**: Sends a single optimized batch payload to SafeOpenSource for all primary dependencies.
3. **On-Demand Scan Fallback**: For uncataloged packages, automatically triggers `/api/scan` and polls the queue until analysis is complete.
4. **Visual ASCII Table**: Formats terminal output with ANSI colors, score gauges, verdicts, and license compliance indicators.
5. **Remediation Guide**: On audit failure, prints violation reasons, observed risks, and recommends safer alternatives from `direct_alternatives` with exit code `1`.

---

## 9. Verification & Test Harness Suite

The codebase includes an automated verification suite in `scripts/`:

| Verification Script | Scope Tested | Key Assertions |
| :--- | :--- | :--- |
| `scripts/verify-admin.js` | Control Plane Security | Stealth 404, rate-limiting (429), Argon2id login, CSRF enforcement (403), score tampering prevention (422), queue gating, MCP stdio calls. |
| `scripts/verify-scanner.js` | On-Demand Scanner API | Rate limits, async queue polling, cache hits, scoring equality against baseline. |
| `scripts/verify-scan-accuracy.js` | Ground-Truth Accuracy | Strict score validation against live reference targets. |
| `scripts/verify-themes.js` | WCAG & Design Tokens | Zero raw hex codes in components; 100% theme token adoption; WCAG AAA/AA contrast compliance. |
| `scripts/verify-ai-agents.js` | AI Agent Data Signals | Permission models, CVE structures, and runbook definitions for AI tooling. |
| `scripts/verify-radar-and-cta.js` | Radar Scope & Search | SVG radar plotting coordinates, quadrant distribution, search island keyboard triggers. |

---

## 10. Operations, Scripts, & Deployment

### 10.1 NPM Scripts Reference
- `npm run dev`: Starts local Astro development server on `http://localhost:4321`.
- `npm run build`: Compiles production static assets and SSR server bundles into `dist/`.
- `npm run preview`: Launches standalone Node server (`scripts/preview.js`) serving both SSR endpoints and static assets.
- `npm run check`: Runs `@astrojs/check` and TypeScript validation.

### 10.2 Production Deployment (Linux VPS + Caddy)
The project compiles to `dist/` with a standalone Node entrypoint for dynamic routes. When deployed behind **Caddy Server**:
- Caddy provides automatic Let's Encrypt TLS certificates, HTTP/3, and gzip/zstd compression.
- Server-Sent Events (SSE) connections at `/api/mcp/sse` are passed through with immediate chunk flushing via `X-Accel-Buffering: no`.
- Static assets (`/_astro/*`, `favicon.svg`) are cached with 1-year immutable headers.
- Security headers (`HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`) are enforced globally.

---

## 11. Summary Checklist & Project Health

- [x] **Embedded SQLite + Drizzle ORM**: Zero-lock database in WAL mode replacing static JSON files.
- [x] **Vulnerability Intelligence**: OSV.dev package advisories and FIRST.org EPSS scores integrated with sliding-window rate limiters.
- [x] **EPSS Risk Gate**: Mandatory defensive override for weaponized CVEs (EPSS > 0.60 forces Risky; EPSS $\in [0.20, 0.60]$ caps score at 60).
- [x] **Remote MCP over SSE**: Server-Sent Events transport at `/api/mcp/sse` and `/api/mcp/messages` with two-tier permissions and 15s keepalive heartbeats.
- [x] **Standalone Zero-Dependency CLI**: `@safeopensource/cli` in `packages/cli` auditing npm, PyPI, and Go manifests.
- [x] **Dedicated Batch API**: `/api/scan/batch` resolving package dossiers and alternatives in a single round-trip.
- [x] **45 Cataloged Tools**: Fully typed definitions in SQLite with zero hardcoded UI strings.
- [x] **13 Curated Categories**: Hand-crafted editorial taxonomies.
- [x] **Hardened Control Plane**: Stealth 404, Argon2id + optional 2FA, CSRF protection, and append-only SQLite audit log.
- [x] **WCAG AA Compliance**: High-contrast dark data-forward aesthetic with multi-modal status indicators.
