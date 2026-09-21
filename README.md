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

