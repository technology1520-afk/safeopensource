import type { APIRoute } from 'astro';
import { fetchAllTools, getAlternatives } from '../../../utils/tools';
import type { ToolData } from '../../../types/tool';

export const prerender = false;

interface BatchQueryItem {
  name: string;
  version?: string;
  ecosystem?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload. Expected { packages: string[] } or { dependencies: Array }' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const rawList: any[] = Array.isArray(body)
      ? body
      : body.packages || body.dependencies || [];

    const queries: BatchQueryItem[] = rawList.map((item) => {
      if (typeof item === 'string') {
        return { name: item.trim() };
      }
      return {
        name: (item.name || '').trim(),
        version: item.version,
        ecosystem: item.ecosystem,
      };
    }).filter((q) => q.name.length > 0);

    const allTools = fetchAllTools();
    const results: Array<any> = [];
    const uncataloged: string[] = [];

    // Helper map for fast normalized lookups
    const toolMapBySlug = new Map<string, ToolData>();
    const toolMapByRepo = new Map<string, ToolData>();
    const toolMapByName = new Map<string, ToolData>();

    for (const tool of allTools) {
      toolMapBySlug.set(tool.slug.toLowerCase(), tool);
      toolMapByRepo.set(tool.repo.toLowerCase(), tool);
      toolMapByName.set(tool.name.toLowerCase(), tool);

      const repoShort = tool.repo.split('/')[1]?.toLowerCase();
      if (repoShort) {
        toolMapBySlug.set(repoShort, tool);
      }
    }

    for (const query of queries) {
      const strippedGithub = query.name.toLowerCase().replace(/^(https?:\/\/)?github\.com\//, '');
      const normalizedName = strippedGithub.replace(/^@[^/]+\//, '');
      const rawLower = query.name.toLowerCase();

      const matchedTool =
        toolMapBySlug.get(rawLower) ||
        toolMapBySlug.get(normalizedName) ||
        toolMapByRepo.get(rawLower) ||
        toolMapByRepo.get(strippedGithub) ||
        toolMapByName.get(rawLower);

      if (matchedTool) {
        const alternatives = getAlternatives(matchedTool, 3).map((alt) => ({
          name: alt.name,
          slug: alt.slug,
          score: alt.safety_score,
          verdict: alt.verdict,
          repo: alt.repo,
        }));

        results.push({
          query_name: query.name,
          requested_version: query.version || null,
          ecosystem: query.ecosystem || 'unknown',
          slug: matchedTool.slug,
          repo: matchedTool.repo,
          name: matchedTool.name,
          version: matchedTool.latest_release || query.version || 'latest',
          safety_score: matchedTool.safety_score,
          verdict: matchedTool.verdict,
          license: matchedTool.license_spdx || 'Unknown',
          stars: matchedTool.stars,
          cves: matchedTool.cves || [],
          risk_reasons: matchedTool.risk_reasons || [],
          epss_score: matchedTool.epss_score ?? null,
          osv_advisories: matchedTool.osv_advisories || [],
          direct_alternatives: alternatives,
        });
      } else {
        uncataloged.push(query.name);
      }
    }

    return new Response(
      JSON.stringify({
        total_queried: queries.length,
        cataloged_count: results.length,
        uncataloged_count: uncataloged.length,
        results,
        uncataloged,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Batch lookup failure' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async () => {
  const allTools = fetchAllTools();
  return new Response(
    JSON.stringify({
      status: 'ok',
      endpoint: '/api/scan/batch',
      method: 'POST',
      total_cataloged: allTools.length,
      sample_payload: { packages: ['uptime-kuma', 'vaultwarden'] },
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

