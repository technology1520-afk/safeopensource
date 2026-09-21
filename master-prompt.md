# BUILD SPEC: SafeOpenSource — open-source tool directory with Safety Scores

> Master prompt for a coding agent. Feed whole file. Data: ../tools_data/*.json
> (35 scored tools), plan: ../safeopensource-website-plan.md

## Mission
Build a production website for safeopensource.org: a directory of open-source
tools, each evaluated with a 0–100 Safety Score and an AI-generated report.
Target audience: beginners choosing software, and developers choosing libraries.
The differentiator is TRUST: every tool page shows WHY a tool is safe or risky,
from verifiable data.

## Non-negotiable constraints
1. Stack: Astro 5 (static output) + TypeScript strict + Tailwind CSS 4.
   No client-side framework unless a component genuinely needs it (max: one
   React/Preact island for search). Rationale: SEO + Core Web Vitals are a
   business requirement, not a nice-to-have.
2. Content source: a typed dataset (src/data/tools/*.json) matching this schema:
   { repo, name, tagline, category, license_spdx, stars, contributors,
     last_push_days, latest_release, safety_score, verdict ("healthy"|
     "caution"|"risky"), risk_reasons: string[], scorecard: number|null,
     components: {security_health, maintenance, community, releases},
     ai_report: string, scanned_at: ISO-date }
   35 tool JSONs will be provided. Never hardcode tool data in components.
3. Every page must pass: valid semantic HTML, single H1, meta description,
   OpenGraph tags, JSON-LD (SoftwareApplication + aggregateRating on tool
   pages), sitemap.xml, robots.txt.
4. Accessibility: WCAG AA contrast on the dark theme, keyboard-navigable
   search, prefers-reduced-motion respected. Score must never be conveyed by
   color alone (always text label + icon).
5. Performance budget: LCP < 2.0s on 4G, CLS < 0.1, zero layout-shifting ads
   slots (reserved, fixed-height containers).

## Design system — "dark data-forward" (Linear/Vercel school)
- Base: #0A0B0E background, #131519 surface, 1px #23262E borders. No shadows
  heavier than subtle; depth via borders, not elevation.
- Text: #E6E8EB primary, #9BA1AB secondary, #6B7280 tertiary.
- Accent: #3B82F6 (interactive), with status colors: healthy #10B981,
  caution #F59E0B, risky #EF4444. Used ONLY for status, never decoration.
- Type: Inter (UI) + JetBrains Mono (scores, commands, numbers). Fluid scale
  16/18/22/30/44. Uppercase 11px mono micro-labels for section eyebrows.
- Radius: 12px cards, 8px buttons/inputs. Spacing on an 8px grid, cards gap
  16px. Max content width 1200px.
- Motion: 150ms ease-out transitions only. No parallax, no glow effects.
- Light mode: implement via CSS custom properties from day one; default dark.

## Pages (7 templates)
1. `/` Home: hero (value prop + search), category grid (13 categories),
   "Safest this month" bento row (3 featured tools), "Recently flagged"
   section (risky/archived tools — this builds trust), how-scoring-works strip.
2. `/tools/[slug]` THE money page. Layout top-to-bottom:
   a. Header: name, tagline, verdict badge, score ring (SVG, animated count-up
      once, static otherwise), repo stats row (stars/license/last release).
   b. "AI Repo Scan" panel: ai_report prose + "Last scanned {scanned_at}"
      chip + link to raw data.
   c. Score breakdown: 4 horizontal bars with weights shown.
   d. Risk reasons list (each with a plain-language explanation).
   e. License explainer card: "Can I use this commercially?" — generated
      from license_spdx via a lookup table (MIT/Apache/BSD → yes; GPL/LGPL →
      yes with conditions; AGPL → yes, but network-use clause; none → warn).
   f. Install box: tabbed (Docker/npm/pip where applicable) with copy button.
   g. Alternatives: 3 same-category tool cards.
3. `/categories/[slug]`: intro paragraph (2-3 unique sentences per category,
   written by hand, not templated), tool cards sorted by score.
4. `/alternatives/[a]-vs-[b]`: comparison table (score, license, stars,
   language, self-host difficulty) + "which should you pick" verdict.
   Generate only for pairs within the same category.
5. `/starter-kits`: curated bundles ("First home server", "Private Google
   Photos", "Team wiki in an afternoon").
6. `/how-we-score`: methodology page — weights, data sources (OpenSSF
   Scorecard, GitHub API), limitations, update frequency. This page is
   required for credibility and AdSense.
7. Legal: /about /privacy /terms /contact — required before AdSense.

## Components to build
ToolCard, ScoreRing, VerdictBadge, ScoreBar, RiskList, LicenseExplainer,
InstallTabs, SearchDialog (island; fuzzy match on name/tagline/category),
CategoryCard, BentoRow, ScanChip.

## SEO rules (business-critical)
- Titles: "{Tool} — Safety Score {n}/100 & Repo Scan | SafeOpenSource"
- Each tool page needs >=300 words of unique prose (AI report + license
  explainer + risk explanations count). No page ships as only numbers/tables.
- Internal links: every tool page links to its category + 3 alternatives;
  categories link to all their tools. No orphan pages.
- Comparison pages target "x vs y" queries; category intros target "best open
  source {category}".

## Definition of done (verify each, don't claim — prove)
[ ] `astro build` zero errors; all 35 tool pages + 13 categories generated
[ ] Lighthouse >= 95 perf / 100 SEO / 100 accessibility on home + a tool page
[ ] JSON-LD validates at validator.schema.org on a tool page
[ ] Search finds a tool by misspelled name ("upptime" → uptime-kuma required)
[ ] All colors pass WCAG AA (list the contrast ratios in the handoff)
[ ] No tool data hardcoded in any component (grep proves it)
[ ] README: how to add a new tool (one JSON file + rebuild), how to run
    the weekly score refresh cron, deploy instructions for a Linux VPS
    behind Caddy with safeopensource.org + www redirect + HTTPS

## Out of scope (do not build now)
User accounts, comments, API endpoints, AdSense script (leave a reserved
<AdSlot> container only), newsletter backend.
