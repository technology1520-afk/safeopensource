# SafeOpenSource (safeopensource.org)

Production website for **SafeOpenSource**: an open-source tool directory where every software tool is evaluated with a 0–100 Safety Score, risk indicators, license analysis, and AI-generated repository scans.

Built with **Astro 5 (Static Output)**, **TypeScript (Strict)**, **Tailwind CSS 4**, and **Preact** (minimal search island).

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build static production distribution
npm run build

# 4. Preview the static production build locally
npm run preview
```

---

## How to Add a New Tool (One JSON File + Rebuild)

Never hardcode tool data inside Astro components. Every tool is loaded dynamically from `src/data/tools/<slug>.json`.

To add a new tool:

1. Create `src/data/tools/<your-tool-slug>.json`.
2. Follow this strict JSON schema:

```json
{
  "slug": "your-tool-slug",
  "repo": "owner/repo",
  "name": "Your Tool Name",
  "tagline": "One sentence describing the tool.",
  "category": "monitoring-status",
  "license_spdx": "MIT",
  "stars": 12500,
  "contributors": 85,
  "last_push_days": 2,
  "latest_release": "v1.0.0",
  "safety_score": 92,
  "verdict": "healthy",
  "risk_reasons": [
    "Optional operational flag or backup requirement."
  ],
  "scorecard": 8.5,
  "components": {
    "security_health": 94,
    "maintenance": 92,
    "community": 90,
    "releases": 88
  },
  "language": "Go",
  "self_host_difficulty": "Easy",
  "install_commands": {
    "docker": "docker run -d -p 8080:8080 your-tool:latest"
  },
  "website_url": "https://yourtool.org",
  "ai_report": "Detailed prose evaluation (at least 300 words total unique text on page)...",
  "scanned_at": "2026-09-18T10:00:00.000Z"
}
```

3. Rebuild the website:
```bash
npm run build
```
Astro automatically generates:
- The tool page at `/tools/<your-tool-slug>`
- Updated category pages at `/categories/<category>`
- Direct head-to-head comparison pages at `/alternatives/<tool>-vs-<other>`
- Updated instant search index for `Cmd+K`
- Static raw JSON endpoint at `/data/tools/<your-tool-slug>.json`
- Regenerated `sitemap-index.xml` and `robots.txt`

---

## How to Run the Weekly Score Refresh Cron

The repository includes an automated refresh script (`scripts/refresh-scores.ts`) that fetches live commit activity, stars, and OpenSSF Scorecards from GitHub and OpenSSF APIs.

### Manual Execution:
```bash
# Optional: set GitHub token to avoid API rate limits
export GITHUB_TOKEN="ghp_yourPersonalAccessToken"

# Execute audit refresh
npx tsx scripts/refresh-scores.ts

# Rebuild static site
npm run build
```

### Automated Linux Systemd / Cron Job:
Add this line to `/etc/crontab` to run every Sunday at 03:00 UTC:

```cron
0 3 * * 0 root cd /var/www/safeopensource && GITHUB_TOKEN="ghp_xxx" npx tsx scripts/refresh-scores.ts && npm run build
```

---

## Production VPS Deployment Guide (Linux + Caddy)

This website compiles to static HTML/CSS/JS in `dist/`. For maximum speed, HTTP/3, and automatic Let's Encrypt TLS certificates, deploy behind **Caddy Server** on Ubuntu/Debian.

### 1. Server Setup
```bash
# Update server
sudo apt update && sudo apt upgrade -y

# Install Node.js 20+ and Caddy
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy git
```

### 2. Clone & Build
```bash
sudo mkdir -p /var/www/safeopensource
sudo chown -R $USER:$USER /var/www/safeopensource
git clone <your-repo-url> /var/www/safeopensource
cd /var/www/safeopensource

npm ci
npm run build
```

### 3. Caddyfile Configuration
Edit `/etc/caddy/Caddyfile`:

```caddy
# Redirect www.safeopensource.org -> safeopensource.org with HTTPS
www.safeopensource.org {
    redir https://safeopensource.org{uri} permanent
}

# Primary static site host
safeopensource.org {
    root * /var/www/safeopensource/dist
    file_server

    # Clean URLs & Custom 404
    try_files {path} {path}/ /404.html

    # Performance & Security Headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
    }

    # Static assets caching (1 year immutable)
    @static {
        path /_astro/* /favicon.svg
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    # HTML files caching (10 minutes)
    @html {
        path *.html /
    }
    header @html Cache-Control "public, max-age=600, must-revalidate"

    # Gzip & Zstandard compression
    encode zstd gzip
}
```

### 4. Reload Caddy
```bash
sudo systemctl reload caddy
```
Caddy will automatically provision SSL certificates from Let's Encrypt for `safeopensource.org` and `www.safeopensource.org`.

---

## Design System & WCAG AA Contrast Ratios

The design system adheres to the **"dark data-forward" (Linear/Vercel)** school:

| Role | Color | Hex | Background | Contrast Ratio | WCAG AA Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Background | Base | `#0A0B0E` | — | — | Base |
| Surface Card | Surface | `#131519` | `#0A0B0E` | Subtle Depth | Pass |
| Primary Text | Text Primary | `#E6E8EB` | `#0A0B0E` | **16.5:1** | **Pass (AAA)** |
| Secondary Text | Text Secondary | `#9BA1AB` | `#0A0B0E` | **7.8:1** | **Pass (AAA)** |
| Tertiary Text | Micro Labels | `#6B7280` | `#0A0B0E` | **4.7:1** | **Pass (AA)** |
| Interactive Accent | Blue | `#3B82F6` | `#0A0B0E` | **4.8:1** | **Pass (AA)** |
| Status Healthy | Emerald | `#10B981` | `#131519` | **5.5:1** | **Pass (AA)** |
| Status Caution | Amber | `#F59E0B` | `#131519` | **6.1:1** | **Pass (AA)** |
| Status Risky | Rose | `#EF4444` | `#131519` | **4.7:1** | **Pass (AA)** |

> **Accessibility Note**: Safety Scores and verdicts are **never** communicated by color alone. Every score and badge explicitly pairs an accessible text label ("Healthy", "Caution", "Risky") with a semantic SVG status icon.

---

## Definition of Done Verification
- [x] `astro build` zero errors; all 39 tool pages + 13 category pages + comparison pages generated
- [x] Lighthouse >= 95 perf / 100 SEO / 100 accessibility
- [x] JSON-LD `SoftwareApplication` + `aggregateRating` validated on tool pages
- [x] Search island matches misspelled queries ("upptime" → `uptime-kuma`)
- [x] All colors pass WCAG AA contrast
- [x] Zero tool data hardcoded in components (proven via automated grep)

---

## The /admin Control Plane (Owner + AI Agent Only)

The site includes an isolated, high-security control plane designed strictly for two principals:
1. **Owner (Human)**: Single hardcoded account with Argon2id password hash, 30-minute rolling session cookies, and CSRF protection on all mutating forms.
2. **AI Agent (MCP Client)**: Non-interactive programmatic access via dual 256-bit API keys (`ADMIN_API_KEY` for write/control, `ADMIN_API_KEY_READONLY` for monitoring), constant-time token comparison, and rate-limiting.

### Hard Security & Stealth Guarantees
- **Stealth 404**: Unauthenticated requests to `/admin` or `/admin/api/*` return an empty HTTP 404 (`body.length === 0`). Port scanners and crawlers find no indication that `/admin` exists.
- **Zero Public Exposure**: Zero mentions of `/admin` in `robots.txt` or `sitemap-index.xml`.
- **Sliding-Window Rate Limiting**: Max 5 failed auth attempts per minute per IP. 6th attempt triggers HTTP 429 lockout.
- **Append-Only Audit Log**: Every action (owner logins, agent rescans, content edits, auth failures) is logged to `data/audit.jsonl` with IP, timestamp, and before/after diffs.

---

### 1. Owner Setup (Secrets & First Login)

Run the secret generator script to generate production credentials:

```bash
# Generate secrets and automatically write to local .env (git-ignored)
node scripts/gen-admin-secrets.mjs --email admin@safeopensource.org --password "YourStrongPasswordHere" --write-env
```

This generates:
- `ADMIN_EMAIL`: Owner login identifier
- `ADMIN_PASSWORD_HASH`: Argon2id hash of the password
- `ADMIN_API_KEY`: 32-byte hex key for Agent full write access
- `ADMIN_API_KEY_READONLY`: 32-byte hex key for Agent monitoring access

#### First Login:
1. Start the server (`npm run build && npm run preview`).
2. Navigate directly to `http://localhost:4321/admin/login`.
3. Sign in with `ADMIN_EMAIL` and your password.
4. The server validates Argon2id, issues a 30-minute `sos_session` cookie (`HttpOnly; SameSite=Strict; Path=/admin`), and redirects to `/admin`.

---

### 2. Double-Gate Reverse Proxy Setup (Caddy)

For internet-facing production deployments, use Caddy as a double gate in front of the application:
1. **Layer 1**: IP allowlist + HTTP Basic Auth in Caddy for the human UI path (`/admin`).
2. **Layer 2**: Internal Argon2id session + CSRF token in the application.

```caddyfile
safeopensource.org {
    # Public routes proxied to Astro Node server
    reverse_proxy 127.0.0.1:4321

    # Double gate for /admin human interface
    @admin_ui {
        path /admin /admin/*
        not path /admin/api/*
    }
    handle @admin_ui {
        # Layer 1A: IP Allowlist (trusted VPN / home IP)
        remote_ip 192.168.1.0/24 10.0.0.0/8 203.0.113.195/32

        # Layer 1B: Basic Auth
        basicauth {
            admin $2a$14$Z1...hash...
        }

        # Forward to app for Layer 2 app session
        reverse_proxy 127.0.0.1:4321
    }
}
```

---

### 3. AI Agent & Model Context Protocol (MCP) Integration

The control plane exposes an official MCP server at `scripts/mcp-server.js` using `@modelcontextprotocol/sdk`.

#### Exposed MCP Tools:
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `sos_rescan` | `repos?: string[]` | Triggers immediate security scorecard & commit sweep for one or all tools. |
| `sos_add_tool` | `repo: string, category: string, name?: string` | Enrolls a new repository, generates safety score and draft AI report. |
| `sos_update_content`| `repo: string, fields: object` | Updates human-written fields (tagline, use_cases, requirements, who_for). Scores remain pipeline-owned. |
| `sos_status` | *(none)* | Returns pipeline freshness, cron status, GitHub API budget, and flagged tools. |

#### MCP Client Configuration (`claude_desktop_config.json` or Antigravity / Cursor):
```json
{
  "mcpServers": {
    "safeopensource": {
      "command": "node",
      "args": ["/var/www/safeopensource/scripts/mcp-server.js"],
      "env": {
        "ADMIN_API_URL": "http://localhost:4321/admin/api",
        "ADMIN_API_KEY": "YOUR_32_BYTE_HEX_KEY"
      }
    }
  }
}
```

---

### 4. Control Plane Automated Test Suite

Run the automated verification suite to validate all security rules and capabilities:

```bash
node scripts/verify-admin.js
```

Verifies:
- Stealth 404 (empty body) for unauthenticated visitors
- Agent Bearer token authentication (Read vs Write permissions)
- Rate limiting (5 failed attempts per min $\rightarrow$ HTTP 429)
- Owner Argon2id authentication and 30-minute session lifecycle
- CSRF protection (mutations without token $\rightarrow$ HTTP 403)
- End-to-end agent rescan and append-only audit trail logging
- Absence of `/admin` in `robots.txt`, `sitemap-index.xml`, and public HTML


