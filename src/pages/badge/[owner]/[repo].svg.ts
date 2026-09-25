import type { APIRoute } from 'astro';
import { getTool } from '../../../lib/admin/tools-service';
import { THEME_TOKENS } from '../../../styles/theme-tokens';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

// Simple abuse prevention for badge embedding: 120 req/min per IP
const badgeRateLimiter = new Map<string, { count: number; resetAt: number }>();

function isBadgeAbuse(ip: string): boolean {
  const now = Date.now();
  let record = badgeRateLimiter.get(ip);
  if (!record || now > record.resetAt) {
    badgeRateLimiter.set(ip, { count: 1, resetAt: now + 60000 });
    return false;
  }
  record.count++;
  return record.count > 120;
}

export const GET: APIRoute = async ({ params, request, clientAddress, url }) => {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : clientAddress || '127.0.0.1';

  if (isBadgeAbuse(ip)) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  const themeParam = url.searchParams.get('theme');
  const palette = themeParam === 'lavender-lab' || themeParam === 'light'
    ? THEME_TOKENS.lavenderLab
    : THEME_TOKENS.cosmicVoid;

  const rawOwner = params.owner || '';
  const rawRepo = (params.repo || '').replace(/\.svg$/, '');
  const fullRepo = `${rawOwner}/${rawRepo}`.toLowerCase();
  const slug = rawRepo.toLowerCase();

  // Try looking up in catalog
  let tool = getTool(slug) || getTool(fullRepo);

  // If not found in catalog, try data/scans
  if (!tool) {
    const scanFile = path.join(process.cwd(), 'data', 'scans', `${slug}.json`);
    if (fs.existsSync(scanFile)) {
      try {
        tool = JSON.parse(fs.readFileSync(scanFile, 'utf-8'));
      } catch {
        // Continue
      }
    }
  }

  let scoreText = tool ? `${Math.round(tool.safety_score)}/100` : 'NOT SCANNED';
  let verdictText = tool ? tool.verdict.toUpperCase() : 'UNKNOWN';
  let badgeColor: string = palette.healthy;

  if (!tool) {
    badgeColor = palette.neutral;
  } else if (tool.verdict === 'caution') {
    badgeColor = palette.caution;
  } else if (tool.verdict === 'risky') {
    badgeColor = palette.risky;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="28" viewBox="0 0 240 28" role="img" aria-label="SafeOpenSource Safety Score: ${scoreText} ${verdictText}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${palette.surface2}" />
      <stop offset="100%" stop-color="${palette.bg}" />
    </linearGradient>
    <clipPath id="r">
      <rect width="240" height="28" rx="6" />
    </clipPath>
  </defs>
  
  <g clip-path="url(#r)">
    <!-- Base Background -->
    <rect width="240" height="28" fill="url(#bg)" stroke="${palette.border}" stroke-width="1" />
    
    <!-- Left Section: SafeOpenSource -->
    <rect x="0" y="0" width="126" height="28" fill="${palette.surface}" />
    <path d="M 126 0 L 126 28" stroke="${palette.border}" stroke-width="1" />
    
    <!-- Shield Logo -->
    <g transform="translate(10, 6) scale(0.65)" stroke="${palette.accent}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </g>
    
    <text x="32" y="18" fill="${palette.text}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="11" font-weight="600" letter-spacing="0.2">SafeOpenSource</text>
    
    <!-- Right Section: Score Badge Pill -->
    <rect x="134" y="4.5" width="98" height="19" rx="4" fill="${palette.surface2}" stroke="${palette.border}" stroke-width="1" />
    
    <circle cx="144" cy="14" r="3.5" fill="${badgeColor}" />
    <text x="153" y="17.5" fill="${palette.text}" font-family="'JetBrains Mono', monospace, -apple-system, sans-serif" font-size="10" font-weight="700">${scoreText}</text>
    <text x="195" y="17" fill="${badgeColor}" font-family="'JetBrains Mono', monospace, -apple-system, sans-serif" font-size="9" font-weight="700" letter-spacing="0.5">${verdictText.slice(0, 7)}</text>
  </g>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
};
