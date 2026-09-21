import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE_URL = 'http://localhost:4321';

async function runTests() {
  console.log('=== STARTING REAL ON-DEMAND SCANNER VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  const assert = (cond, msg) => {
    if (!cond) {
      console.error(`  ✕ FAIL: ${msg}`);
      failed++;
      throw new Error(`Assertion failed: ${msg}`);
    } else {
      console.log(`  ✓ ${msg}`);
      passed++;
    }
  };

  // ==========================================
  // DoD 1: Scanning github.com/jellyfin/jellyfin returns score identical to catalog score
  // ==========================================
  console.log('1. Testing Jellyfin Ground Truth & Pipeline Score Equality...');
  try {
    const jellyfinCatalog = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'src', 'data', 'tools', 'jellyfin.json'), 'utf-8')
    );

    const sec1Ip = '198.51.101.' + Math.floor(Math.random() * 200 + 10);
    const res = await fetch(`${BASE_URL}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': sec1Ip },
      body: JSON.stringify({ url: 'https://github.com/jellyfin/jellyfin', force: true }),
    });

    assert(res.status === 202 || res.status === 200, 'POST /api/scan for jellyfin returned 200 or 202');
    const data = await res.json();
    assert(!!data.jobId || (data.cached && data.tool), 'Received scan job or cached result');

    let finalTool = data.tool;
    if (data.jobId) {
      // Poll until finished
      for (let i = 0; i < 25; i++) {
        await new Promise((r) => setTimeout(r, 600));
        const statusRes = await fetch(`${BASE_URL}/api/scan/${data.jobId}`);
        const job = await statusRes.json();
        if (job.status === 'completed') {
          finalTool = job.result;
          break;
        } else if (job.status === 'failed') {
          throw new Error(`Job failed: ${job.error}`);
        }
      }
    }

    assert(!!finalTool, 'Jellyfin scan completed successfully');
    assert(
      finalTool.safety_score === jellyfinCatalog.safety_score,
      `Scanned score (${finalTool.safety_score}) equals catalog ground truth (${jellyfinCatalog.safety_score})`
    );
    assert(
      finalTool.verdict === jellyfinCatalog.verdict,
      `Scanned verdict (${finalTool.verdict}) equals catalog verdict (${jellyfinCatalog.verdict})`
    );
  } catch (err) {
    console.error('  ✕ Jellyfin scan failed:', err.message);
    failed++;
  }

  // ==========================================
  // DoD 2: Input Validation (no 500s)
  // ==========================================
  console.log('\n2. Testing Input Validation & Error Handling (Zero 500s)...');
  try {
    // 2a. Non-GitHub URL
    const nonGhRes = await fetch(`${BASE_URL}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://gitlab.com/someuser/somerepo' }),
    });
    assert(nonGhRes.status === 400, 'Non-GitHub URL returned HTTP 400 Bad Request');
    const nonGhData = await nonGhRes.json();
    assert(
      nonGhData.error && nonGhData.error.includes('Only public GitHub repositories are supported'),
      'Returned clear inline error for non-GitHub URL'
    );

    // 2b. 404 non-existent repo
    const sec2Ip = '198.51.102.' + Math.floor(Math.random() * 200 + 10);
    const notFoundRes = await fetch(`${BASE_URL}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': sec2Ip },
      body: JSON.stringify({ url: 'https://github.com/definitely-nonexistent-user-12345/nonexistent-repo-99999', force: true }),
    });
    assert(notFoundRes.status === 202, '404 repo job queued');
    const notFoundJobData = await notFoundRes.json();

    // Poll until stage 1 fails
    let failedJob = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const jobRes = await fetch(`${BASE_URL}/api/scan/${notFoundJobData.jobId}`);
      const job = await jobRes.json();
      if (job.status === 'failed') {
        failedJob = job;
        break;
      }
    }
    assert(failedJob !== null, '404 repo failed cleanly at Stage 1');
    assert(
      failedJob.error.includes('Repository not found or private'),
      '404 repo gave clear explanation ("Repository not found or private")'
    );
    assert(failedJob.retryable === true, 'Job marked as retryable (no dead spinner)');

    // 2c. Malformed string
    const malformedRes = await fetch(`${BASE_URL}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not even a url' }),
    });
    assert(malformedRes.status === 400, 'Malformed URL string returned 400 without crashing');
  } catch (err) {
    console.error('  ✕ Validation test failed:', err.message);
    failed++;
  }

  // ==========================================
  // DoD 3: Rate Limiting Enforcement
  // ==========================================
  console.log('\n3. Testing Rate Limiting (4th scan in hour -> 429 with retry-after)...');
  try {
    // Generate unique IP for test
    const testIp = '198.51.100.' + Math.floor(Math.random() * 200 + 10);
    const headers = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': testIp,
    };

    // First 3 scans should be permitted (or cached)
    for (let i = 1; i <= 3; i++) {
      const r = await fetch(`${BASE_URL}/api/scan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: `https://github.com/test-org/repo-${i}` }),
      });
      assert(r.status === 202 || r.status === 200, `Scan ${i}/3 allowed`);
    }

    // 4th scan must be blocked with HTTP 429
    const r4 = await fetch(`${BASE_URL}/api/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url: 'https://github.com/test-org/repo-4' }),
    });
    assert(r4.status === 429, '4th scan within hour returned HTTP 429 Too Many Requests');
    assert(r4.headers.has('retry-after'), 'Response contains Retry-After header');
    const r4Data = await r4.json();
    assert(r4Data.retryAfter > 0, 'Response body specifies retryAfter seconds');
    assert(r4Data.error.includes('Rate limit exceeded'), 'Response gives clear rate limit reason');
  } catch (err) {
    console.error('  ✕ Rate limiting test failed:', err.message);
    failed++;
  }

  // ==========================================
  // DoD 4: Stage Failure & Retry Mechanism
  // ==========================================
  console.log('\n4. Testing Stage Failure & Retry Surface...');
  try {
    const scanPageRes = await fetch(`${BASE_URL}/scan`);
    assert(scanPageRes.status === 200, '/scan page loads with HTTP 200');
    const scanPageHtml = await scanPageRes.text();
    assert(scanPageHtml.includes('id="retry-scan-btn"'), '/scan UI contains Retry Scan button');
    assert(scanPageHtml.includes('id="stage-failure-box"'), '/scan UI contains explicit failure stage box');
    assert(!scanPageHtml.includes('spinner-border'), 'No generic dead loading spinner');
  } catch (err) {
    console.error('  ✕ Stage failure test failed:', err.message);
    failed++;
  }

  // ==========================================
  // DoD 5: Badge Endpoint (Valid SVG, 24h cache, rate-limited)
  // ==========================================
  console.log('\n5. Testing Live Badge Endpoint (/badge/:owner/:repo.svg)...');
  try {
    const badgeRes = await fetch(`${BASE_URL}/badge/jellyfin/jellyfin.svg`);
    assert(badgeRes.status === 200, 'GET /badge/jellyfin/jellyfin.svg returned 200');
    const contentType = badgeRes.headers.get('content-type') || '';
    assert(contentType.includes('image/svg+xml'), 'Content-Type is image/svg+xml');
    const cacheControl = badgeRes.headers.get('cache-control') || '';
    assert(cacheControl.includes('max-age=86400'), 'Cache-Control sets 24h max-age (86400)');

    const svgText = await badgeRes.text();
    assert(svgText.startsWith('<svg'), 'Returned body is valid SVG');
    assert(svgText.includes('SafeOpenSource'), 'Badge renders SafeOpenSource branding');
    assert(svgText.includes('92/100') || svgText.includes('91.8') || svgText.includes('HEALTHY'), 'Badge renders score and verdict');

    // Test tool page maintains badge CTA
    const toolPageRes = await fetch(`${BASE_URL}/tools/jellyfin`);
    assert(toolPageRes.status === 200, 'Tool page /tools/jellyfin loads with HTTP 200');
    const toolHtml = await toolPageRes.text();
    assert(toolHtml.includes('/badge/jellyfin/jellyfin.svg'), 'Tool page embeds live badge URL');
    assert(toolHtml.includes('Embed Live Safety Score Badge'), 'Tool page includes maintainer badging section');
  } catch (err) {
    console.error('  ✕ Badge endpoint test failed:', err.message);
    failed++;
  }

  // ==========================================
  // DoD 6: Zero Fake Scanning Theater Grep
  // ==========================================
  console.log('\n6. Testing Grep for Simulated/Fake Scanning Theater...');
  try {
    const componentsDir = path.join(ROOT, 'src', 'components');
    const files = fs.readdirSync(componentsDir).filter((f) => f.endsWith('.astro'));

    let theaterFound = false;
    for (const f of files) {
      const content = fs.readFileSync(path.join(componentsDir, f), 'utf-8');
      if (content.includes('setInterval') && (content.includes('typing') || content.includes('scanItems'))) {
        console.error(`  ✕ Found simulated scanning interval in ${f}`);
        theaterFound = true;
      }
      if (content.includes('PID 49204')) {
        console.error(`  ✕ Found fake PID string in ${f}`);
        theaterFound = true;
      }
      if (content.includes('@keyframes radar-sweep')) {
        console.error(`  ✕ Found simulated radar sweep keyframe in ${f}`);
        theaterFound = true;
      }
    }

    assert(!theaterFound, 'Zero fake/scanning-theater elements remain across components');

    // Check homepage has no simulated switcher
    const indexHtml = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'index.astro'), 'utf-8');
    assert(!indexHtml.includes('btn-hero-console'), 'Homepage has no fake view switcher button');
    assert(!indexHtml.includes('btn-hero-radar'), 'Homepage has no fake radar switcher button');
    assert(indexHtml.includes('action="/scan"'), 'Homepage contains real on-demand scan form');
  } catch (err) {
    console.error('  ✕ Theater grep test failed:', err.message);
    failed++;
  }

  // ==========================================
  // DoD 7: Performance / Clean Markup on /scan
  // ==========================================
  console.log('\n7. Testing Performance & Markup Integrity on /scan...');
  try {
    const scanRes = await fetch(`${BASE_URL}/scan`);
    const scanHtml = await scanRes.text();
    assert(scanRes.status === 200, '/scan page returns HTTP 200');
    assert(scanHtml.length > 5000, '/scan renders complete SSR document');
    assert(!scanHtml.includes('>undefined<') && !scanHtml.includes('"undefined"'), 'No undefined interpolations on /scan');
    assert(scanHtml.includes('Recent Public Scans'), '/scan features recent public scans strip');
    assert(scanHtml.toLowerCase().includes('<!doctype html>'), '/scan contains valid HTML5 doctype');
  } catch (err) {
    console.error('  ✕ Performance markup test failed:', err.message);
    failed++;
  }

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
