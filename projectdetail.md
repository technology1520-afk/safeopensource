# SafeOpenSource (safeopensource.org) — Comprehensive Project Specification & Architectural Dossier

---

## 1. Executive Summary & Mission

**SafeOpenSource** (`safeopensource.org`) is an open-source security intelligence platform, repository directory, and live Security Operations Center (SOC) console. It evaluates open-source software and developer libraries with a **0–100 Safety Score**, automated vulnerability telemetry, license commercial-use analysis, and AI-generated repository audit dossiers.

### Core Value Proposition & Differentiator: Uncompromising Trust
Unlike generic software directories that rank tools purely by popularity (GitHub stars) or marketing copy, **SafeOpenSource is built around verifiable risk telemetry**:
- **Mathematical Transparency**: Every score is paired with its full component breakdown, weight derivation, data source provenance, and scan timestamp.
- **Defensive Invariants**: Tools with known active Critical/High CVEs or unresolved security advisories are strictly prohibited from receiving a "Healthy" verdict, regardless of numerical metrics.
- **AI Agent Security Profiles**: Specific evaluation criteria for autonomous coding agents and LLM tooling (sandboxing, permission models, egress filtering, prompt injection history).
- **Stealth / Zero-Trust Admin Plane**: High-security operational interface for human administrators and autonomous AI agents with zero public reconnaissance footprint.

---

## 2. Technology Stack & Design System

### 2.1 Core Framework & Libraries
- **Static & SSR Hybrid Framework**: [Astro 5](https://astro.build/) (`astro` ^7.3.3) configured with static output generation and `@astrojs/node` standalone adapter for dynamic admin control plane and on-demand repository scanning.
- **Type Safety**: TypeScript 6.0 in strict mode with comprehensive interface definitions (`src/types/tool.ts`).
- **Styling & CSS Architecture**: Tailwind CSS 4 (`tailwindcss` ^4.3.3 + `@tailwindcss/vite`), built on custom CSS token variables defined in `src/styles/global.css`.
- **Search Island**: [Preact](https://preactjs.com/) (`preact` ^10.29.8, `@astrojs/preact` ^6.0.5) powering an ultra-responsive client-side modal search island (`SearchDialog.tsx`) with [Fuse.js](https://www.fusejs.io/) fuzzy matching.
- **Cryptography & Security**:
  - `@node-rs/argon2` for password hashing on the operator login gateway.
  - Native Node.js `crypto` for timing-safe 256-bit token comparisons and CSRF tokens.
- **AI / Agent Protocols**: Official Model Context Protocol SDK (`@modelcontextprotocol/sdk` ^1.30.0) exposing JSON-RPC stdio management tools.
- **Icons**: Lucide icons via `lucide-astro` and `@lucide/astro`.

### 2.2 Design System — "Lavender Lab / Dark Data-Forward"
The UI follows a modern cybersecurity operations aesthetic inspired by Linear and Vercel:
- **Palette**: Dark, high-contrast surface hierarchy (`--bg: #0A0B0E`, `--surface: #131519`, `--surface-2: #1A1D24`, `--border: #23262E`).
- **Status Semantics**:
  - **Healthy (Emerald)**: `#10B981` (WCAG Contrast 5.5:1 on surface)
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
| **Security Health** | **35%** | Branch protection rules, signed commits, pinned dependencies, SAST scanning (CodeQL), binary artifacts, vulnerability reporting policy. | OpenSSF Scorecard API, GitHub Security Advisories |
| **Maintenance** | **30%** | Days since last commit (`last_push_days`), issue close ratios, release frequency, commit cadence stability. | GitHub REST / GraphQL API |
| **Community** | **20%** | Star count, active contributor diversity (bus factor estimation), organization sponsorship, fork activity. | GitHub Public Metrics |
| **Releases** | **15%** | Semantic versioning adherence, changelog availability, release frequency, release asset verification. | GitHub Releases / Tags |

### 3.2 Non-Negotiable Algorithmic Invariants
1. **Unverified Scorecard Handling**: If an open-source project lacks an OpenSSF Scorecard, `security_health` is set to `null`, a prominent `"Security practices UNVERIFIED"` badge is applied, and the remaining 3 components are proportionally re-weighted.
2. **Defensive Render Override**: If a project has $>0$ active Critical or High CVEs / GHSA advisories, the system refuses to output a `Healthy` verdict, overriding the display to `Caution` or `Risky` regardless of numerical score.
3. **Score Tampering Rejection**: Through `/admin/api/tools/[repo]`, human operators or AI agents are prohibited from manually adjusting calculated score fields (`safety_score`, `scorecard`, `components`). Any attempt immediately returns **HTTP 422 Unprocessable Entity**.

---

## 4. Repository Structure & Directory Map

```
safety-opensource/
├── .env                              # Production credentials & API tokens (git-ignored)
├── astro.config.mjs                  # Astro configuration (standalone Node adapter + Tailwind Vite)
├── package.json                      # Scripts, dependencies, and metadata
├── tsconfig.json                     # TypeScript strict compiler config
├── README.md                         # Quick start, deployment guide, and control plane summary
├── projectdetail.md                  # This file: full architecture & specification dossier
├── deploy.sh                         # Automated VPS deployment script
├── data/                             # Runtime persistent data (audit logs, settings)
│   ├── audit.jsonl                   # Append-only chronological audit log
│   └── settings.json                 # Dynamic control plane settings & rotating key cache
├── public/                           # Static assets (favicons, sitemaps, open-graph assets)
├── scripts/                          # Operational, testing, and verification scripts
│   ├── gen-admin-secrets.mjs / .ts   # Cryptographic secret & password hash generator
│   ├── mcp-server.js                 # Model Context Protocol stdio JSON-RPC server
│   ├── preview.js                    # Node.js production preview & static fallback server
│   ├── refresh-scores.ts             # Scheduled OpenSSF / GitHub score update pipeline
│   ├── score_pipeline.py             # Python analytical scoring pipeline
│   ├── verify-admin.js               # Control plane test suite (auth, CSRF, stealth 404, rate-limits)
│   ├── verify-scanner.js             # On-demand scanner API validation suite
│   ├── verify-scan-accuracy.js       # Ground-truth accuracy validation
│   ├── verify-radar-and-cta.js       # Radar UI & interactive components check
│   ├── verify-themes.js              # WCAG contrast & theme compliance suite
│   └── generate-tools.js             # Synthetic & baseline tool dataset generator
└── src/
    ├── env.d.ts                      # TypeScript Astro environment types
    ├── middleware.ts                 # Security gateway (Stealth 404, rate-limiting, CSRF, auth)
    ├── styles/
    │   ├── global.css                # CSS custom properties, tokens, and utility classes
    │   └── theme-tokens.ts           # Token definitions and programmatic helpers
    ├── types/
    │   └── tool.ts                   # Strict data models (ToolData, CVEs, Agent models, etc.)
    ├── utils/
    │   ├── licenses.ts               # SPDX license commercial-use decision matrix
    │   ├── telemetry.ts              # System-wide metrics, radar data, and aggregations
    │   ├── tool-dossier.ts           # Tool page data loaders and relationship helpers
    │   └── tools.ts                  # Raw tool loading, sorting, and filtering logic
    ├── data/
    │   ├── categories.ts             # 13 Category taxonomies & hand-crafted intros
    │   ├── intents.ts                # Match quiz intent heuristics
    │   ├── starter-kits.ts           # Curated software bundles (Home Server, etc.)
    │   ├── trending.ts               # Momentum, star velocity, and trending telemetry
    │   └── tools/                    # 45+ Production tool JSON definitions (single source of truth)
    ├── lib/
    │   ├── admin/
    │   │   ├── audit.ts              # Structured audit logging functions
    │   │   ├── auth.ts               # Argon2id password verification, session & token validation
    │   │   ├── jobs.ts               # Asynchronous scan job state management
    │   │   ├── settings.ts           # Dynamic runtime settings & API key rotation logic
    │   │   └── tools-service.ts      # Tool mutations, validation, and queue gating
    │   └── scanner/
    │       ├── pipeline.ts           # Live GitHub/OpenSSF repository fetcher & parser
    │       ├── rate-limiter.ts       # Token bucket & sliding-window rate limiters
    │       └── scoring.ts            # Scoring algorithms and algorithmic derivation
    ├── components/
    │   ├── Header.astro              # Global navigation, quick search trigger, scan CTA
    │   ├── Footer.astro              # System status, legal links, license declaration
    │   ├── DetectionRadarHero.astro  # Interactive 360° radar scope visualization
    │   ├── SearchDialog.tsx          # Preact search modal island with Fuse.js
    │   ├── ToolCard.astro            # Catalog card with score badge and stats
    │   ├── ScoreRing.astro           # Animated SVG circular gauge
    │   ├── ScoreBar.astro            # Horizontal weighted breakdown bars
    │   ├── VerdictBadge.astro        # Accessible status badge (Text + SVG icon)
    │   ├── FlagWall.astro            # "The Flag Wall" highlighting risky/archived tools
    │   ├── LicenseExplainer.astro    # Commercial-use permission explainer
    │   ├── InstallTabs.astro         # Tabbed copy-paste deployment instructions
    │   ├── AgentSafetySignals.astro  # Permission model, sandbox specs, and CVE incident log
    │   ├── ToolDossier.astro         # Detailed breakdown and provenance panel
    │   ├── ToolRequirements.astro    # Hardware/runtime requirements table
    │   ├── BentoRow.astro            # Featured high-safety tool showcases
    │   ├── CategoryRadar.astro       # Category-level risk vs. safety distribution
    │   ├── MatchQuiz.astro           # Interactive software recommendation quiz
    │   └── admin/
    │       └── AdminLayout.astro     # Protected SOC Control Plane admin layout
    └── pages/
        ├── index.astro               # Homepage (Radar hero, telemetry cards, flag wall)
        ├── scan.astro                # On-demand repository safety scanner UI
        ├── how-we-score.astro        # Complete scoring methodology & mathematical formulas
        ├── how-to-run-an-ai-agent-safely.astro # Deep-dive operational guide for AI agents
        ├── about.astro / contact.astro / privacy.astro / terms.astro # Legal & info pages
        ├── 404.astro                 # Public branded 404 page
        ├── robots.txt.ts             # Dynamic robots.txt (clean, zero admin beacons)
        ├── badge/[owner]/[repo].svg.ts # Dynamic vector SVG badge generator
        ├── tools/[slug].astro        # In-depth single tool evaluation dossier
        ├── categories/[slug].astro   # Category indexes with curated editorial overviews
        ├── alternatives/[a]-vs-[b].astro # Head-to-head comparison pages
        ├── starter-kits/[slug].astro # Curated software stack bundles
        ├── trending/ & top/          # Momentum rankings and top-rated indices
        ├── api/                      # Public APIs
        │   ├── scan-status.ts        # Public scan queue telemetry
        │   └── scan/                 # Asynchronous scan submission & polling endpoints
        └── admin/                    # Control Plane (Behind Stealth 404 & Dual Auth Gate)
            ├── index.astro           # SOC Control Plane Dashboard
            ├── login.astro           # Human Operator Gateway login form
            ├── queue.astro           # Review queue for unlisted scans & pending tools
            ├── tools.astro           # Tool inventory management & metadata editor
            ├── scans.astro           # Live repository scan job inspector
            ├── audit.astro           # Append-only audit trail viewer
            ├── settings.astro        # Key rotation, grace windows, and operational settings
            └── api/                  # Protected REST endpoints for UI and AI Agents
```

---

## 5. Website Pages & Information Architecture

### 5.1 Public Pages
1. **Homepage (`/`)**:
   - **Continuous Defense Radar Scope**: Interactive SVG radar plotting catalog tools across security quadrants.
   - **Live Telemetry Banner**: Real-time counter of cataloged repos (45+), flagged tools, and average safety score.
   - **Hero Scanner Input**: Instant repository evaluator allowing visitors to paste any GitHub repository URL.
   - **Featured Bento Row**: Highlighting top-rated software across primary categories.
   - **The Flag Wall**: A transparency showcase of archived, risky, or caution-flagged tools to help users avoid compromised dependencies.
2. **Tool Dossier Pages (`/tools/[slug]`)**:
   - **Score Header**: Name, tagline, repository statistics (stars, license, release, activity), verdict badge, and animated circular score gauge.
   - **AI Audit Report**: Prose evaluation analyzing codebase structure, maintainer health, and operational readiness.
   - **Weighted Component Breakdown**: Visual breakdown of Security Health (35%), Maintenance (30%), Community (20%), and Releases (15%).
   - **Risk Reason Callouts**: Explicit explanations of flags (e.g., stale releases, missing 2FA, bus factor risk).
   - **Commercial-Use License Matrix**: Plain-English evaluation of license permissions (MIT/Apache: commercial permitted; GPL/AGPL: source-disclosure conditions).
   - **Deployment Recipes**: Copy-paste commands across Docker, Docker Compose, npm, pip, go, or native binaries.
   - **System Requirements & Audience**: Hardware footprint (RAM, CPU, disk) and "Perfect for" / "Skip if" guidance.
   - **AI Agent Safety Signals**: For autonomous agents (Aider, OpenHands, AutoGPT, OpenClaw), displays permission models, sandboxing requirements, and historical vulnerability reports.
   - **Direct Alternatives**: Recommends 3 top-scoring competitors in the same category.
3. **Category Portals (`/categories/[slug]`)**:
   - 13 categories (Self-Hosted Cloud, Password Managers, Media Servers, Developer Tools, Monitoring & Status, Home Automation, AI Coding Agents, Analytics, etc.).
   - Unique, hand-written editorial introductions and full comparative tables sorted by Safety Score.
4. **Head-to-Head Comparisons (`/alternatives/[a]-vs-[b]`)**:
   - Direct comparison tables contrasting scores, star velocity, license flexibility, resource demands, and maintenance cadence between direct rivals (e.g., `immich-vs-photoprism`, `vaultwarden-vs-passbolt`).
5. **Starter Kits (`/starter-kits`)**:
   - Curated collections of open-source tools packaged for common real-world objectives: "First Home Server", "Private Cloud", "Local LLM Dev Rig".
6. **Methodology (`/how-we-score`)**:
   - Full mathematical derivation, data source documentation, scorecard normalization formulas, and audit frequency declarations.
7. **Vector SVG Badges (`/badge/[owner]/[repo].svg`)**:
   - Embeddable badges for README files dynamically reflecting real-time safety scores and verdict colors.

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
   - Rotating an API key archives the retired key in `data/settings.json` for exactly 24 hours, preventing abrupt downtime for external automated agents or cron jobs.
7. **Queue Gate**:
   - Community-submitted or scanner-enrolled tools land in the database as `unlisted: true`.
   - Unapproved tools return HTTP 404 on the public catalog until vetted and approved by an operator or authorized agent.
8. **Accuracy Invariant & Regression Self-Test**:
   - On every load, `/admin` runs an automated internal self-test against reference ground-truth repositories (`jellyfin/jellyfin`, `openclaw/openclaw`, `filebrowser/filebrowser`).
   - If any core metric deviates, a prominent **Red Alert Banner** halts operations until mathematical calibration is restored.
9. **Append-Only Audit Trail**:
   - Every login attempt, metadata edit, queue approval, and rebuild trigger is logged with timestamp, principal, IP, and diffs to `data/audit.jsonl`.

---

## 7. Model Context Protocol (MCP) Integration

The project includes a native MCP server (`scripts/mcp-server.js`) compliant with the Model Context Protocol standard. This enables LLM coding agents (e.g., Antigravity, Claude Desktop, Cursor) to manage the platform via standard JSON-RPC stdio.

### Exposed MCP Tools (1:1 parity with Admin API)
| MCP Tool Name | Arguments | Description |
| :--- | :--- | :--- |
| `sos_status` | *(none)* | Returns pipeline health, tool counts (listed/unlisted/flagged), last audit sweep, and queue status. |
| `sos_rescan` | `repos?: string[]` | Triggers immediate OpenSSF Scorecard and GitHub telemetry sweep for one or all tools. |
| `sos_add_tool` | `repo_url`, `category`, `name?` | Enrolls a new repository; places it in review queue as unlisted. |
| `sos_edit_tool`| `repo`, `fields: object` | Updates human-authored fields (taglines, install commands). Tampering with scores returns HTTP 422. |
| `sos_approve`  | `tool_id: string` | Promotes a tool from review queue to public catalog. |
| `sos_reject`   | `tool_id: string`, `reason?` | Rejects and purges a pending submission. |
| `sos_rebuild`  | *(none)* | Triggers static site rebuild and deployment via `deploy.sh`. |
| `sos_audit`    | `limit?: number` | Queries recent chronological audit log entries. |

---

## 8. Verification & Test Harness Suite

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

## 9. Operations, Scripts, & Deployment

### 9.1 NPM Scripts Reference
- `npm run dev`: Starts local Astro development server on `http://localhost:4321`.
- `npm run build`: Compiles production static assets and SSR server bundles into `dist/`.
- `npm run preview`: Launches standalone Node server (`scripts/preview.js`) serving both SSR endpoints and static assets.
- `npm run check`: Runs `@astrojs/check` and TypeScript validation.

### 9.2 Production Deployment (Linux VPS + Caddy)
The project compiles to `dist/` with a standalone Node entrypoint for dynamic routes. When deployed behind **Caddy Server**:
- Caddy provides automatic Let's Encrypt TLS certificates, HTTP/3, and gzip/zstd compression.
- Static assets (`/_astro/*`, `favicon.svg`) are cached with 1-year immutable headers.
- HTML files are served with 10-minute revalidation caches.
- Security headers (`HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`) are enforced globally.

---

## 10. Summary Checklist & Project Health

- [x] **45 Cataloged Tools**: Fully typed JSON definitions with zero data hardcoded in UI components.
- [x] **13 Curated Categories**: With hand-crafted editorial intros.
- [x] **Mathematical Integrity**: 4-component weighted scoring engine with defensive overrides for critical vulnerabilities.
- [x] **Hardened Control Plane**: Stealth 404, Argon2id + optional 2FA, CSRF protection, and audit logging.
- [x] **Full MCP Integration**: Official stdio JSON-RPC interface for autonomous LLM agents.
- [x] **Search Island**: Instant modal search with fuzzy typo-tolerance.
- [x] **WCAG AA Compliance**: High-contrast dark data-forward aesthetic with multi-modal status indicators.
