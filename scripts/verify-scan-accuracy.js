import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE_URL = 'http://localhost:4321';

async function runTests() {
  console.log('=== STARTING SCAN ACCURACY & PIPELINE ALIGNMENT VERIFICATION ===\n');
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

  // Helper to run a scan and wait for completion
  async function performScan(repoUrl, force = true) {
    const ip = '198.51.100.' + Math.floor(Math.random() * 200 + 10);
    const res = await fetch(`${BASE_URL}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ url: repoUrl, force }),
    });

    assert(res.status === 200 || res.status === 202, `POST /api/scan for ${repoUrl} returned ${res.status}`);
    const data = await res.json();

    if (data.cached && data.tool) {
      return { tool: data.tool, job: null };
    }

    assert(!!data.jobId, `Received scan jobId: ${data.jobId}`);

    let completedJob = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 600));
      const statusRes = await fetch(`${BASE_URL}/api/scan/${data.jobId}`);
      assert(statusRes.status === 200, `GET /api/scan/${data.jobId} returned 200`);
      const job = await statusRes.json();
      if (job.status === 'completed') {
        completedJob = job;
        break;
      } else if (job.status === 'failed') {
        throw new Error(`Scan job failed: ${job.error}`);
      }
    }

    assert(!!completedJob, `Scan job for ${repoUrl} completed within timeout`);
    return { tool: completedJob.result, job: completedJob };
  }

  // ==========================================
  // TEST 1: Jellyfin Ground Truth & Byte-Identical Score
  // ==========================================
  console.log('1. Testing Jellyfin Ground Truth & tools_data Byte-Identity...');
  try {
    const refFile = path.join(ROOT, 'tools_data', 'jellyfin__jellyfin.json');
    assert(fs.existsSync(refFile), 'tools_data/jellyfin__jellyfin.json exists');
    const refData = JSON.parse(fs.readFileSync(refFile, 'utf-8'));

    const { tool, job } = await performScan('https://github.com/jellyfin/jellyfin', true);
    assert(tool.safety_score === refData.safety_score, `Scan returns byte-identical safety_score: ${tool.safety_score} === ${refData.safety_score}`);
    assert(tool.safety_score === 91.8, 'Jellyfin score is exactly 91.8');
    assert(tool.verdict === 'healthy', `Jellyfin verdict is healthy (got ${tool.verdict})`);
    assert(tool.scorecard === 8.5, `Jellyfin scorecard is 8.5 (got ${tool.scorecard})`);
    assert(tool.components.security_health === 94, 'Jellyfin security_health is 94');
    assert(tool.components.maintenance === 96, 'Jellyfin maintenance is 96');
    assert(tool.components.community === 95, 'Jellyfin community is 95');
    assert(tool.components.releases === 91, 'Jellyfin releases is 91');

    // Provenance line verification for score > 75
    assert(!!tool.provenance, 'Provenance line is present on scan result');
    assert(
      tool.provenance.includes('Security Health 94 (35%)') &&
      tool.provenance.includes('Maintenance 96 (30%)') &&
      tool.provenance.includes('Community 95 (20%)') &&
      tool.provenance.includes('Releases 91 (15%)') &&
      tool.provenance.includes('91.8'),
      `Provenance line contains full derivation: "${tool.provenance}"`
    );

    // Timestamp verification: "Scanned YYYY-MM-DD HH:mm UTC"
    const timestampRegex = /^Scanned \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/;
    assert(
      timestampRegex.test(tool.scanned_at_formatted),
      `Timestamp matches format "Scanned YYYY-MM-DD HH:mm UTC": "${tool.scanned_at_formatted}"`
    );

    // Advisory source verification: "GitHub Advisory DB, checked {date}"
    assert(
      tool.advisories_source && tool.advisories_source.includes('GitHub Advisory DB, checked'),
      `Advisory source states attribution: "${tool.advisories_source}"`
    );
  } catch (err) {
    console.error('  ✕ Test 1 failed:', err.message);
    failed++;
  }

  // ==========================================
  // TEST 2: Scorecard 404 is NOT a pass & weight redistribution (NousResearch/hermes-agent)
  // ==========================================
  console.log('\n2. Testing Scorecard 404 Handling & Proportional Weight Redistribution (hermes-agent)...');
  try {
    const { tool, job } = await performScan('https://github.com/NousResearch/hermes-agent', true);

    // Check Step 2 subtext
    if (job && job.stages) {
      const stage2 = job.stages.find((s) => s.id === 2);
      assert(!!stage2, 'Stage 2 exists in scan job');
      assert(
        stage2.message === 'No OpenSSF Scorecard available — security practices unverified',
        `Step 2 subtext is exact: "${stage2.message}"`
      );
    }

    // Scorecard 404 requirements
    assert(tool.scorecard === null, 'Scorecard rating is null');
    assert(tool.components.security_health === null, 'security_health component is null');
    assert(tool.safety_score === 71.8, `Score equals 71.8 under redistributed weights (got ${tool.safety_score})`);
    assert(tool.verdict === 'caution', `Verdict is capped at CAUTION (got ${tool.verdict})`);

    // Provenance line for redistributed weights
    assert(!!tool.provenance, 'Provenance line is present for redistributed weights');
    assert(
      tool.provenance.includes('Maintenance 92 (46.2%)') &&
      tool.provenance.includes('Community 70 (30.8%)') &&
      tool.provenance.includes('Releases 34 (23.1%)') &&
      tool.provenance.includes('71.8'),
      `Provenance reflects 3-way redistribution: "${tool.provenance}"`
    );

    // Timestamp & Advisories attribution
    const timestampRegex = /^Scanned \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/;
    assert(timestampRegex.test(tool.scanned_at_formatted), `Hermes-agent timestamp valid: "${tool.scanned_at_formatted}"`);
    assert(tool.advisories_source.includes('GitHub Advisory DB, checked'), 'Hermes-agent advisory source attributed');
  } catch (err) {
    console.error('  ✕ Test 2 failed:', err.message);
    failed++;
  }

  // ==========================================
  // TEST 3: Archived repository flag (filebrowser/filebrowser)
  // ==========================================
  console.log('\n3. Testing Archived Repo Flag & Risky Verdict (filebrowser/filebrowser)...');
  try {
    const { tool, job } = await performScan('https://github.com/filebrowser/filebrowser', true);

    assert(tool.archived === true, 'Repo flagged with archived: true');
    assert(tool.verdict === 'risky', `Verdict is risky for archived repo (got ${tool.verdict})`);

    const hasArchivedFlag = tool.risk_reasons.some((r) => r.includes('ARCHIVED — FLAGGED'));
    assert(hasArchivedFlag, 'risk_reasons contains "ARCHIVED — FLAGGED" entry');
    console.log(`    Risk reasons sample: ${tool.risk_reasons[0]}`);
  } catch (err) {
    console.error('  ✕ Test 3 failed:', err.message);
    failed++;
  }

  // ==========================================
  // TEST 4: Frontend UI Rendering Verification
  // ==========================================
  console.log('\n4. Testing Frontend UI Rendering on Tool & Scan Pages...');
  try {
    // 4a. /tools/jellyfin
    const jfRes = await fetch(`${BASE_URL}/tools/jellyfin`);
    assert(jfRes.status === 200, 'GET /tools/jellyfin returned 200');
    const jfHtml = await jfRes.text();

    assert(jfHtml.includes('Score Provenance'), '/tools/jellyfin renders "Score Provenance" section for >75');
    assert(jfHtml.includes('Security Health 94 (35%)'), '/tools/jellyfin renders provenance derivation line');
    assert(jfHtml.includes('Scanned') && jfHtml.includes('UTC'), '/tools/jellyfin displays Scanned ... UTC timestamp');
    assert(jfHtml.includes('GitHub Advisory DB, checked'), '/tools/jellyfin displays GitHub Advisory DB checked attribution');

    // 4b. /tools/hermes-agent
    const haRes = await fetch(`${BASE_URL}/tools/hermes-agent`);
    assert(haRes.status === 200, 'GET /tools/hermes-agent returned 200');
    const haHtml = await haRes.text();
    assert(haHtml.includes('UNVERIFIED'), '/tools/hermes-agent renders UNVERIFIED badge for null security_health');
    assert(haHtml.includes('weight redistributed'), '/tools/hermes-agent renders weight redistributed indicator');

    // 4c. /scan
    const scanRes = await fetch(`${BASE_URL}/scan`);
    assert(scanRes.status === 200, 'GET /scan returned 200');
    const scanHtml = await scanRes.text();
    assert(scanHtml.includes('success-scanned-timestamp'), '/scan contains timestamp element');
    assert(scanHtml.includes('success-provenance-box'), '/scan contains provenance element');
    assert(scanHtml.includes('success-advisories-source'), '/scan contains advisory source element');
  } catch (err) {
    console.error('  ✕ Test 4 failed:', err.message);
    failed++;
  }

  // ==========================================
  // TEST 5: score_pipeline.py Python parity test
  // ==========================================
  console.log('\n5. Testing score_pipeline.py Python CLI Parity...');
  try {
    const pyOutput = execSync('python scripts/score_pipeline.py jellyfin/jellyfin', { encoding: 'utf-8' });
    const pyData = JSON.parse(pyOutput);
    assert(pyData.safety_score === 91.8, `Python pipeline for jellyfin returns 91.8 (got ${pyData.safety_score})`);
    assert(pyData.verdict === 'healthy', `Python pipeline verdict is healthy (got ${pyData.verdict})`);
    assert(pyData.provenance.includes('Security Health 94 (35%)'), 'Python pipeline outputs provenance line');
  } catch (err) {
    console.warn('  ⚠ Python CLI check skipped or failed:', err.message);
  }

  console.log(`\n==========================================`);
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
