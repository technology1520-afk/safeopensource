import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.join(__dirname, '..', 'src', 'data', 'tools');

interface ToolJson {
  slug: string;
  repo: string;
  name: string;
  tagline: string;
  category: string;
  license_spdx: string;
  stars: number;
  contributors: number;
  last_push_days: number;
  latest_release: string;
  safety_score: number;
  verdict: 'healthy' | 'caution' | 'risky';
  risk_reasons: string[];
  scorecard: number | null;
  components: {
    security_health: number;
    maintenance: number;
    community: number;
    releases: number;
  };
  ai_report: string;
  scanned_at: string;
  language: string;
  self_host_difficulty: string;
  install_commands: Record<string, string>;
  website_url?: string;
}

import { compute_safety } from '../src/lib/scanner/scoring.ts';

async function refreshTool(filePath: string): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const tool: ToolJson = JSON.parse(content);

  console.log(`[REFRESH] Auditing ${tool.name} (${tool.repo})...`);

  try {
    // If GITHUB_TOKEN is available, we query GitHub API
    const headers: Record<string, string> = {
      'User-Agent': 'SafeOpenSource-AuditBot/1.0'
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const ghRes = await fetch(`https://api.github.com/repos/${tool.repo}`, { headers });
    if (ghRes.ok) {
      const repoData = await ghRes.json();
      tool.stars = repoData.stargazers_count ?? tool.stars;

      if (repoData.pushed_at) {
        const pushedDate = new Date(repoData.pushed_at);
        const diffMs = Date.now() - pushedDate.getTime();
        tool.last_push_days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    // Optional OpenSSF scorecard query:
    // https://api.securityscorecards.dev/projects/github.com/{owner}/{repo}
    const ossfRes = await fetch(`https://api.securityscorecards.dev/projects/github.com/${tool.repo}`);
    if (ossfRes.ok) {
      const ossfData = await ossfRes.json();
      if (typeof ossfData.score === 'number') {
        tool.scorecard = Math.round(ossfData.score * 10) / 10;
        tool.components.security_health = Math.min(100, Math.round(tool.scorecard * 10));
      }
    }
  } catch (err) {
    console.warn(`[WARN] Network telemetry lookup skipped for ${tool.slug}: ${(err as Error).message}`);
  }

  // Update composite score & scanned timestamp using canonical compute_safety
  const scoringResult = compute_safety({
    repo: tool.repo,
    slug: tool.slug,
    scorecardScore: tool.scorecard,
    stars: tool.stars,
    lastPushDays: tool.last_push_days,
    customComponents: tool.components,
  });

  tool.safety_score = scoringResult.safety_score;
  tool.verdict = scoringResult.verdict;
  tool.components = scoringResult.components;
  tool.scorecard = scoringResult.scorecard;
  tool.scanned_at = new Date().toISOString();

  fs.writeFileSync(filePath, JSON.stringify(tool, null, 2), 'utf-8');
  console.log(`[DONE] Updated ${tool.slug}: Score ${tool.safety_score} (${tool.verdict})`);
}

async function runRefresh() {
  const files = fs.readdirSync(toolsDir).filter((f) => f.endsWith('.json'));
  console.log(`Starting weekly audit refresh for ${files.length} tools...`);

  for (const file of files) {
    const fullPath = path.join(toolsDir, file);
    await refreshTool(fullPath);
    // Pause briefly to respect external API rate limits
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log(`Successfully refreshed all ${files.length} tools.`);
}

runRefresh().catch((err) => {
  console.error('[ERROR] Audit refresh failed:', err);
  process.exit(1);
});

