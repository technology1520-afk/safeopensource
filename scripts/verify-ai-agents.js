import http from 'node:http';

async function test() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error('FAIL: ' + msg);
    console.log('  ✓ ' + msg);
  };

  console.log('--- VERIFYING AI AGENT ENHANCED SIGNALS ---');

  const tools = ['openclaw', 'openhands', 'autogpt', 'aider'];
  for (const slug of tools) {
    const res = await fetch('http://localhost:4321/tools/' + slug);
    assert(res.status === 200, 'Tool page ' + slug + ' returned 200');
    const html = await res.text();
    assert(html.includes('RUNS WITH YOUR CREDENTIALS'), slug + ' has warning chip');
    assert(
      html.includes('Permission &amp; Sandboxing Architecture') ||
      html.includes('Permission & Sandboxing Architecture'),
      slug + ' has permission architecture section'
    );
    assert(html.includes('OPERATOR VERDICT:'), slug + ' has human-written operator verdict');
    assert(html.includes('GitHub Advisory Database CVEs'), slug + ' has CVE advisory section');
    assert(html.includes('Documented Escape'), slug + ' has incident history section');
  }

  // Empty state vs Populated state
  const aiderRes = await fetch('http://localhost:4321/tools/aider');
  const aiderHtml = await aiderRes.text();
  assert(aiderHtml.includes('NO KNOWN CVEs DETECTED'), 'Aider shows explicit non-blank CVE empty state');
  assert(aiderHtml.includes('NO ESCAPE INCIDENTS DOCUMENTED'), 'Aider shows explicit non-blank incident empty state');

  const clawRes = await fetch('http://localhost:4321/tools/openclaw');
  const clawHtml = await clawRes.text();
  assert(clawHtml.includes('CVE-2026-35650'), 'OpenClaw lists CVE-2026-35650');
  assert(
    clawHtml.includes('OpenClaw Indirect Prompt Injection Sandbox Escape'),
    'OpenClaw incident title rendered'
  );

  // Score weighting on agent page
  assert(
    clawHtml.includes('Security Health') &&
    (clawHtml.includes('55%') || clawHtml.includes('55% Weight')),
    'Agent score weights security health at 55%'
  );

  // How-we-score documentation
  const scoreRes = await fetch('http://localhost:4321/how-we-score');
  const scoreHtml = await scoreRes.text();
  assert(
    scoreHtml.includes('Why AI Agents Weight Security Health at 55%'),
    '/how-we-score documents AI Agents'
  );
  assert(scoreHtml.includes('55%'), '/how-we-score documents 55% weight for Security Health');

  // Category page
  const catRes = await fetch('http://localhost:4321/categories/ai-agents');
  assert(catRes.status === 200, 'AI agents category returned 200');
  const catHtml = await catRes.text();
  assert(catHtml.includes('HIGH-PRIVILEGE SECTOR NOTICE'), 'Category has high-privilege sector notice');
  assert(catHtml.includes('/how-to-run-an-ai-agent-safely'), 'Category links to safety guide');

  // Safety guide page
  const guideRes = await fetch('http://localhost:4321/how-to-run-an-ai-agent-safely');
  assert(guideRes.status === 200, 'Guide page returned 200');
  const guideHtml = await guideRes.text();
  assert(
    guideHtml.includes('Rule 1: Never Run on Bare Metal — Enforce Container Isolation'),
    'Guide includes Rule 1'
  );
  assert(guideHtml.includes('Rule 2: Credential Hygiene'), 'Guide includes Rule 2');
  assert(guideHtml.includes('Rule 3: Strict Filesystem Boundaries'), 'Guide includes Rule 3');
  assert(guideHtml.includes('Rule 4: Keep the Human in the Loop'), 'Guide includes Rule 4');
  assert(guideHtml.includes('Rule 5:'), 'Guide includes Rule 5');

  for (const slug of tools) {
    assert(guideHtml.includes('/tools/' + slug), 'Guide links to ' + slug);
  }

  console.log('\n==================================================');
  console.log('ALL AI AGENT ADDENDUM VERIFICATIONS PASSED (100%)');
  console.log('==================================================');
}

test().catch((e) => {
  console.error(e);
  process.exit(1);
});
