import type { APIRoute } from 'astro';
import {
  normalizeGitHubUrl,
  checkRecentScan,
  createScanJob,
  executeScanPipeline,
  getRecentPublicScans,
} from '../../../lib/scanner/pipeline';
import {
  checkScanRateLimit,
  incrementActiveScans,
  decrementActiveScans,
  getActiveScanQueueDepth,
} from '../../../lib/scanner/rate-limiter';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload. Expected { url: string }' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { url, email, force } = body;

    // 1. URL Validation & Normalization
    const { normalized, error: urlError } = normalizeGitHubUrl(url);
    if (urlError || !normalized) {
      return new Response(
        JSON.stringify({ error: urlError || 'Only public GitHub repositories are supported (e.g., github.com/owner/repo)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Client IP & Rate Limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : clientAddress || '127.0.0.1';

    const rateResult = checkScanRateLimit(ip, email);
    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify({
          error: rateResult.message || 'Rate limit exceeded. Anonymous scans are limited to 3 per hour.',
          retryAfter: rateResult.retryAfter,
          limit: rateResult.limit,
          remaining: rateResult.remaining,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateResult.retryAfter),
            'X-RateLimit-Limit': String(rateResult.limit),
            'X-RateLimit-Remaining': String(rateResult.remaining),
          },
        }
      );
    }

    // 3. 7-Day Cache Check (unless force is true)
    if (!force) {
      const { tool: cachedTool, daysAgo } = checkRecentScan(normalized.fullRepo, normalized.slug);
      if (cachedTool) {
        return new Response(
          JSON.stringify({
            cached: true,
            daysAgo,
            message: daysAgo === 0 ? 'Scanned today' : `Rescanned ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`,
            tool: cachedTool,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 4. Create and Enqueue Real Scan Job
    const job = createScanJob(normalized, url);
    incrementActiveScans();

    // Start asynchronous execution in background
    executeScanPipeline(job).finally(() => {
      decrementActiveScans();
    });

    return new Response(
      JSON.stringify({
        jobId: job.id,
        status: job.status,
        stages: job.stages,
        queueDepth: rateResult.queueDepth,
        cached: false,
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal scanner error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async () => {
  const recentScans = getRecentPublicScans(5);
  const queueDepth = getActiveScanQueueDepth();

  return new Response(
    JSON.stringify({
      recentScans,
      queueDepth,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10',
      },
    }
  );
};
