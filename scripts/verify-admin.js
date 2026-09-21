#!/usr/bin/env node

/**
 * Comprehensive Verification Suite for SafeOpenSource /admin Control Plane
 * Tests all requirements from BUILD PROMPT:
 * 1. Stealth 404 (empty body) for unauthenticated /admin and /admin/api/*
 * 2. Agent write & readonly key enforcement
 * 3. End-to-end rescan with audit log "agent" entry and diff
 * 4. Owner login, session creation, 403 on missing CSRF token, success with CSRF
 * 5. Grep test: zero /admin references in public HTML, robots.txt, and sitemap
 * 6. Rate limiting & 401 on wrong API keys (run last to prevent IP lockout on test suite)
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
}

const PORT = process.env.PORT || 4321;
const BASE_URL = `http://localhost:${PORT}`;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@safeopensource.org';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const ADMIN_API_KEY_READONLY = process.env.ADMIN_API_KEY_READONLY;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log('=== STARTING /admin CONTROL PLANE VERIFICATION ===\n');

  // Test 1: Stealth 404 for unauthenticated GET /admin
  console.log('1. Testing Stealth 404 on unauthenticated requests...');
  try {
    const resAdmin = await fetch(`${BASE_URL}/admin`);
    const bodyAdmin = await resAdmin.text();
    assert(resAdmin.status === 404, `GET /admin returned 404 (got ${resAdmin.status})`);
    assert(bodyAdmin.trim() === '', `GET /admin returned empty body (length: ${bodyAdmin.length})`);

    const resApi = await fetch(`${BASE_URL}/admin/api/health`);
    const bodyApi = await resApi.text();
    assert(resApi.status === 404, `GET /admin/api/health returned 404 without auth (got ${resApi.status})`);
    assert(bodyApi.trim() === '', `GET /admin/api/health returned empty body (length: ${bodyApi.length})`);

    const resPost = await fetch(`${BASE_URL}/admin/api/rescan`, { method: 'POST' });
    const bodyPost = await resPost.text();
    assert(resPost.status === 404, `POST /admin/api/rescan returned 404 without auth (got ${resPost.status})`);
    assert(bodyPost.trim() === '', `POST /admin/api/rescan returned empty body`);
  } catch (err) {
    assert(false, `Stealth test failed: ${err.message}`);
  }

  // Test 2: Agent Bearer Keys (Write vs Read-Only)
  console.log('\n2. Testing Agent Bearer Keys (Write vs Read-Only)...');
  try {
    // Test Read-Only Key on GET
    const readOnlyGet = await fetch(`${BASE_URL}/admin/api/tools`, {
      headers: { 'Authorization': `Bearer ${ADMIN_API_KEY_READONLY}` },
    });
    assert(readOnlyGet.status === 200, `Read-only key allowed GET /admin/api/tools (200 OK)`);
    const toolsData = await readOnlyGet.json();
    assert(Array.isArray(toolsData) && toolsData.length > 0, `Returned ${toolsData.length} cataloged tools`);

    // Test Read-Only Key on mutating POST -> should be 403 Forbidden
    const readOnlyPost = await fetch(`${BASE_URL}/admin/api/rescan`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_API_KEY_READONLY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repo: 'uptime-kuma' }),
    });
    assert(readOnlyPost.status === 403, `Read-only key blocked from mutating POST (got 403 Forbidden)`);

    // Test Full Admin Key on GET /admin/api/health
    const healthRes = await fetch(`${BASE_URL}/admin/api/health`, {
      headers: { 'Authorization': `Bearer ${ADMIN_API_KEY}` },
    });
    assert(healthRes.status === 200, `Full admin key allowed GET /admin/api/health (200 OK)`);
    const healthJson = await healthRes.json();
    assert(healthJson.pipeline?.freshness === 'nominal', `Pipeline freshness verified nominal`);
  } catch (err) {
    assert(false, `Agent key test failed: ${err.message}`);
  }

  // Test 3: End-to-End Agent Rescan & Audit Trail Verification
  console.log('\n3. Testing End-to-End Agent Rescan & Audit Logging...');
  try {
    const rescanRes = await fetch(`${BASE_URL}/admin/api/rescan`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repo: 'uptime-kuma' }),
    });
    assert(rescanRes.status === 200, `Agent triggered rescan for uptime-kuma (200 OK)`);
    const rescanJson = await rescanRes.json();
    assert(rescanJson.status === 'completed', `Rescan job completed successfully`);

    // Verify audit log
    const auditFile = path.join(__dirname, '..', 'data', 'audit.jsonl');
    assert(fs.existsSync(auditFile), `Audit log file exists at data/audit.jsonl`);
    const auditLines = fs.readFileSync(auditFile, 'utf-8').trim().split('\n');
    const lastEntries = auditLines.slice(-10).map((l) => JSON.parse(l));

    const agentScanEntry = lastEntries.find(
      (e) => e.principal === 'agent' && e.action === 'TOOL_RESCAN' && e.details?.slug === 'uptime-kuma'
    );
    assert(Boolean(agentScanEntry), `Found audit entry labeled "agent" for TOOL_RESCAN on uptime-kuma`);
    assert(Array.isArray(agentScanEntry?.details?.diff), `Audit entry contains verified telemetry diff`);
  } catch (err) {
    assert(false, `Agent rescan test failed: ${err.message}`);
  }

  // Test 3.5: MCP Server Integration via Stdio (scripts/mcp-server.js)
  console.log('\n3.5. Testing Model Context Protocol Server (scripts/mcp-server.js)...');
  try {
    const mcpRes = await new Promise((resolve, reject) => {
      const child = spawn('node', ['scripts/mcp-server.js'], {
        env: {
          ...process.env,
          ADMIN_API_KEY,
          ADMIN_API_URL: `${BASE_URL}/admin/api`,
        },
        stdio: ['pipe', 'pipe', 'inherit'],
      });

      const callPayload = JSON.stringify({
        jsonrpc: '2.0',
        id: 42,
        method: 'tools/call',
        params: {
          name: 'sos_status',
          arguments: {},
        },
      }) + '\n';

      let out = '';
      child.stdout.on('data', (d) => {
        out += d.toString();
        if (out.includes('"result"')) {
          child.kill();
          try {
            resolve(JSON.parse(out.trim()));
          } catch {
            resolve(out);
          }
        }
      });

      child.stdin.write(callPayload);
      setTimeout(() => {
        child.kill();
        reject(new Error('MCP execution timed out'));
      }, 5000);
    });

    assert(Boolean(mcpRes.result?.content), `MCP sos_status returned content array via JSON-RPC stdio`);
    const statusText = mcpRes.result?.content?.[0]?.text;
    assert(statusText && !statusText.includes('Admin API error'), `MCP status returned valid telemetry from Admin API`);
  } catch (err) {
    assert(false, `MCP server test failed: ${err.message}`);
  }

  // Test 4: Owner Login, Session Lifecycle, and CSRF Protection
  console.log('\n4. Testing Owner Login & CSRF Protection...');
  try {
    const testPassword = process.env.ADMIN_TEST_PASSWORD || process.env.ADMIN_PASSWORD || 'super-secret-admin-pass-2050';

    // Attempt login with credentials
    const loginParams = new URLSearchParams();
    loginParams.append('email', ADMIN_EMAIL);
    loginParams.append('password', testPassword);

    const loginRes = await fetch(`${BASE_URL}/admin/login`, {
      method: 'POST',
      body: loginParams,
      redirect: 'manual',
    });

    const setCookie = loginRes.headers.get('set-cookie');
    assert(
      loginRes.status === 302 || loginRes.status === 200,
      `Owner login succeeded (status ${loginRes.status})`
    );
    assert(Boolean(setCookie && setCookie.includes('sos_session=')), `Received httpOnly session cookie`);

    const sessionMatch = setCookie?.match(/sos_session=([^;]+)/);
    const sessionCookie = sessionMatch ? `sos_session=${sessionMatch[1]}` : '';

    // Access /admin dashboard with session cookie
    const dashboardRes = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: sessionCookie },
    });
    assert(dashboardRes.status === 200, `Authenticated owner can access /admin (200 OK)`);
    const dashboardHtml = await dashboardRes.text();
    assert(dashboardHtml.includes('SOC CONTROL PLANE'), `Dashboard contains SOC CONTROL PLANE banner`);
    assert(dashboardHtml.includes(ADMIN_EMAIL), `Dashboard displays authenticated operator email`);

    // Extract CSRF token from dashboard HTML
    const csrfMatch = dashboardHtml.match(/name="csrf"\s+value="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : null;
    assert(Boolean(csrfToken), `Found CSRF token in dashboard DOM`);

    // Test mutating action WITHOUT CSRF token -> MUST RETURN 403
    const noCsrfRes = await fetch(`${BASE_URL}/admin/api/rebuild`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    });
    assert(noCsrfRes.status === 403, `Mutating without CSRF token returned 403 Forbidden`);

    // Test mutating action WITH CSRF token -> MUST SUCCEED
    const validCsrfRes = await fetch(`${BASE_URL}/admin/api/rebuild`, {
      method: 'POST',
      headers: {
        Cookie: sessionCookie,
        'X-CSRF-Token': csrfToken,
      },
    });
    assert(
      validCsrfRes.status === 200 || validCsrfRes.status === 202,
      `Mutating with valid CSRF token succeeded (${validCsrfRes.status} OK)`
    );
  } catch (err) {
    assert(false, `Owner session & CSRF test failed: ${err.message}`);
  }

  // Test 5: Grep Stealth Tests (Zero /admin references in public site)
  console.log('\n5. Testing Stealth & Absence of /admin in Public Assets...');
  try {
    // Check robots.txt
    const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
    const robotsText = await robotsRes.text();
    assert(!robotsText.includes('/admin'), `robots.txt contains NO mention of /admin (beacon avoided)`);

    // Check sitemap-index.xml
    const sitemapRes = await fetch(`${BASE_URL}/sitemap-index.xml`);
    const sitemapText = await sitemapRes.text();
    assert(!sitemapText.includes('/admin'), `sitemap-index.xml contains NO mention of /admin`);

    // Check homepage and catalog HTML
    const homeRes = await fetch(`${BASE_URL}/`);
    const homeHtml = await homeRes.text();
    assert(!homeHtml.includes('href="/admin"'), `Homepage contains zero links to /admin`);
  } catch (err) {
    assert(false, `Grep stealth test failed: ${err.message}`);
  }

  // Test 6: Invalid API key -> 401 & Rate limiting after 5 failures (executed last)
  console.log('\n6. Testing Bearer API Key validation & Rate Limiting (destructive)...');
  try {
    const badKeyRes = await fetch(`${BASE_URL}/admin/api/health`, {
      headers: { 'Authorization': 'Bearer totally-invalid-secret-key-1234' },
    });
    assert(badKeyRes.status === 401, `Wrong API key returned 401 Unauthorized (got ${badKeyRes.status})`);

    // Trigger 4 more failures to hit rate limit threshold (5 total)
    for (let i = 0; i < 4; i++) {
      await fetch(`${BASE_URL}/admin/api/health`, {
        headers: { 'Authorization': 'Bearer wrong-key-' + i },
      });
    }

    const rateLimitedRes = await fetch(`${BASE_URL}/admin/api/health`, {
      headers: { 'Authorization': 'Bearer wrong-key-overflow' },
    });
    assert(
      rateLimitedRes.status === 429,
      `Rate limiting triggered after 5 failures -> 429 Too Many Requests (got ${rateLimitedRes.status})`
    );
  } catch (err) {
    assert(false, `Rate limiting test failed: ${err.message}`);
  }

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
