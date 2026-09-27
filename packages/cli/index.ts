#!/usr/bin/env node

/**
 * SafeOpenSource CLI (@safeopensource/cli)
 * Zero-dependency security auditing CLI for open-source dependencies.
 */

import path from 'node:path';
import process from 'node:process';
import { parseManifest, type ParsedDependency, type Ecosystem } from './manifest-parser.js';

// CLI Configuration & Options interface
interface CliOptions {
  manifest?: string;
  minScore: number;
  failOn: 'caution' | 'risky' | 'cve';
  json: boolean;
  apiUrl: string;
  includeDev: boolean;
  timeoutMs: number;
}

interface AlternativeRecommendation {
  name: string;
  slug: string;
  score?: number;
  verdict?: string;
  repo?: string;
}

interface DependencyAuditResult {
  package: string;
  version: string;
  ecosystem: Ecosystem;
  safetyScore: number | null;
  verdict: 'SAFE' | 'CAUTION' | 'RISKY' | 'UNCATALOGED';
  license: string;
  cves: Array<{ id: string; summary?: string; severity?: string }>;
  riskReasons: string[];
  alternatives: AlternativeRecommendation[];
  passed: boolean;
  failureReasons: string[];
}

// ANSI Escape Colors (zero external dependencies)
const isColorSupported = !process.env.NO_COLOR && (process.stdout.isTTY || process.env.FORCE_COLOR);

const colors = {
  reset: isColorSupported ? '\x1b[0m' : '',
  bold: isColorSupported ? '\x1b[1m' : '',
  dim: isColorSupported ? '\x1b[2m' : '',
  red: isColorSupported ? '\x1b[31m' : '',
  green: isColorSupported ? '\x1b[32m' : '',
  yellow: isColorSupported ? '\x1b[33m' : '',
  blue: isColorSupported ? '\x1b[34m' : '',
  magenta: isColorSupported ? '\x1b[35m' : '',
  cyan: isColorSupported ? '\x1b[36m' : '',
  white: isColorSupported ? '\x1b[37m' : '',
  gray: isColorSupported ? '\x1b[90m' : '',
  bgRed: isColorSupported ? '\x1b[41m' : '',
  bgGreen: isColorSupported ? '\x1b[42m' : '',
};

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function parseCliArgs(args: string[]): { command: string; options: CliOptions } {
  const options: CliOptions = {
    minScore: 70,
    failOn: 'risky',
    json: false,
    apiUrl: process.env.SAFEOPENSOURCE_API_URL || 'https://safeopensource.org',
    includeDev: false,
    timeoutMs: 30000,
  };

  let command = 'audit';
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--version' || arg === '-v') {
      console.log('@safeopensource/cli v1.0.0');
      process.exit(0);
    }

    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--dev') {
      options.includeDev = true;
    } else if (arg === '--manifest' || arg === '-m') {
      options.manifest = args[++i];
    } else if (arg === '--min-score' || arg === '-s') {
      const val = parseFloat(args[++i]);
      if (!isNaN(val)) options.minScore = val;
    } else if (arg === '--fail-on' || arg === '-f') {
      const level = args[++i]?.toLowerCase();
      if (level === 'caution' || level === 'risky' || level === 'cve') {
        options.failOn = level;
      }
    } else if (arg === '--api-url') {
      options.apiUrl = (args[++i] || '').replace(/\/$/, '');
    } else if (arg === '--timeout') {
      const ms = parseInt(args[++i], 10);
      if (!isNaN(ms)) options.timeoutMs = ms;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (positional.length > 0) {
    command = positional[0];
  }

  return { command, options };
}

function printHelp(): void {
  console.log(`
${colors.bold}${colors.cyan}SafeOpenSource Security CLI${colors.reset} (@safeopensource/cli)
Continuous open-source security intelligence & dependency auditing for CI/CD.

${colors.bold}USAGE:${colors.reset}
  $ safeopensource audit [options]

${colors.bold}COMMANDS:${colors.reset}
  audit                   Audit manifest dependencies against SafeOpenSource intelligence (default)

${colors.bold}OPTIONS:${colors.reset}
  -m, --manifest <path>   Explicit path to manifest file (auto-detects package.json, requirements.txt, go.mod)
  -s, --min-score <num>   Minimum acceptable Safety Score (0-100, default: 70)
  -f, --fail-on <level>   Policy failure trigger: caution, risky, or cve (default: risky)
  --json                  Output machine-readable JSON for CI/CD pipelines
  --api-url <url>         Custom SafeOpenSource API endpoint (default: https://safeopensource.org)
  --dev                   Include development dependencies
  -h, --help              Show help screen
  -v, --version           Show version

${colors.bold}EXAMPLES:${colors.reset}
  $ safeopensource audit
  $ safeopensource audit --min-score 75 --fail-on caution
  $ safeopensource audit --manifest ./backend/requirements.txt --fail-on cve
  $ safeopensource audit --json > security-audit.json
`);
}

/**
 * Format and render an ASCII table with dynamic column sizing
 */
function renderAsciiTable(headers: string[], rows: string[][]): string {
  const colWidths: number[] = headers.map((h) => stripAnsi(h).length);

  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const len = stripAnsi(row[i] || '').length;
      if (len > colWidths[i]) {
        colWidths[i] = len;
      }
    }
  }

  // Padding helper
  const pad = (str: string, width: number): string => {
    const visibleLength = stripAnsi(str).length;
    const padding = Math.max(0, width - visibleLength);
    return str + ' '.repeat(padding);
  };

  const topBorder = '┌' + colWidths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐';
  const middleBorder = '├' + colWidths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤';
  const bottomBorder = '└' + colWidths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘';

  const headerLine = '│' + headers.map((h, i) => ` ${pad(h, colWidths[i])} `).join('│') + '│';

  const dataLines = rows.map((row) => {
    return '│' + row.map((cell, i) => ` ${pad(cell, colWidths[i])} `).join('│') + '│';
  });

  return [topBorder, headerLine, middleBorder, ...dataLines, bottomBorder].join('\n');
}

/**
 * Query batch intelligence endpoint
 */
async function queryBatchIntelligence(
  apiUrl: string,
  dependencies: ParsedDependency[]
): Promise<{ cataloged: Map<string, any>; uncataloged: string[] }> {
  const cataloged = new Map<string, any>();
  const uncataloged: string[] = [];

  try {
    const res = await fetch(`${apiUrl}/api/scan/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SafeOpenSource-CLI/1.0.0',
      },
      body: JSON.stringify({
        packages: dependencies.map((d) => ({
          name: d.name,
          version: d.version,
          ecosystem: d.ecosystem,
        })),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      for (const item of data.results || []) {
        cataloged.set(item.query_name.toLowerCase(), item);
        cataloged.set(item.slug.toLowerCase(), item);
      }
      for (const unc of data.uncataloged || []) {
        uncataloged.push(unc);
      }
      return { cataloged, uncataloged };
    }
  } catch {
    // Graceful fallback to individual tool queries
  }

  // Fallback: Individual queries to /data/tools/[slug].json
  for (const dep of dependencies) {
    const slug = dep.name.toLowerCase().replace(/^@[^/]+\//, '');
    try {
      const res = await fetch(`${apiUrl}/data/tools/${slug}.json`, {
        headers: { 'User-Agent': 'SafeOpenSource-CLI/1.0.0' },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const item = await res.json();
        cataloged.set(dep.name.toLowerCase(), item);
      } else {
        uncataloged.push(dep.name);
      }
    } catch {
      uncataloged.push(dep.name);
    }
  }

  return { cataloged, uncataloged };
}

/**
 * Trigger an on-demand scan for an uncataloged package and poll for completion
 */
async function scanAndPollPackage(
  apiUrl: string,
  pkgName: string,
  timeoutMs: number,
  isJson: boolean
): Promise<any | null> {
  const cleanName = pkgName.toLowerCase().replace(/^@[^/]+\//, '');
  let candidateUrl = `https://github.com/${cleanName}/${cleanName}`;
  if (pkgName.includes('github.com')) {
    candidateUrl = pkgName.startsWith('http') ? pkgName : `https://${pkgName}`;
  } else if (cleanName.includes('/')) {
    candidateUrl = `https://github.com/${cleanName}`;
  }

  if (!isJson) {
    process.stdout.write(`  ${colors.dim}⟳ Triggering on-demand security scan for "${pkgName}"...${colors.reset}\r`);
  }

  try {
    const triggerRes = await fetch(`${apiUrl}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SafeOpenSource-CLI/1.0.0',
      },
      body: JSON.stringify({ url: candidateUrl }),
      signal: AbortSignal.timeout(8000),
    });

    if (!triggerRes.ok) return null;

    const triggerData = await triggerRes.json();
    if (triggerData.cached && triggerData.tool) {
      return triggerData.tool;
    }

    const jobId = triggerData.jobId;
    if (!jobId) return null;

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const pollRes = await fetch(`${apiUrl}/api/scan/${jobId}`, {
        headers: { 'User-Agent': 'SafeOpenSource-CLI/1.0.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (pollRes.ok) {
        const job = await pollRes.json();
        if (job.status === 'completed' && job.result?.tool) {
          return job.result.tool;
        }
        if (job.status === 'failed') {
          return null;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Main CLI Execution Flow
 */
async function main(): Promise<void> {
  const { command, options } = parseCliArgs(process.argv.slice(2));

  if (command !== 'audit') {
    console.error(`${colors.red}Unknown command: "${command}". Did you mean "audit"?${colors.reset}`);
    process.exit(1);
  }

  // 1. Detect and parse manifest
  let parseResult;
  try {
    parseResult = parseManifest(options.manifest, options.includeDev);
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message, status: 'ERROR', exit_code: 1 }, null, 2));
    } else {
      console.error(`\n${colors.red}${colors.bold}Error:${colors.reset} ${err.message}\n`);
    }
    process.exit(1);
  }

  const { dependencies, detection } = parseResult;

  if (dependencies.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ summary: { total: 0, passed: 0, failed: 0 }, results: [] }, null, 2));
    } else {
      console.log(`${colors.yellow}No dependencies found in ${detection.fileName}.${colors.reset}`);
    }
    process.exit(0);
  }

  if (!options.json) {
    console.log(`\n${colors.bold}${colors.cyan}SafeOpenSource Dependency Audit${colors.reset}`);
    console.log(`${colors.dim}Manifest: ${detection.filePath} (${dependencies.length} ${detection.type} packages)${colors.reset}`);
    console.log(`${colors.dim}Policy: Min Score ${options.minScore} | Fail On: ${options.failOn.toUpperCase()} | API: ${options.apiUrl}${colors.reset}\n`);
  }

  // 2. Query batch intelligence
  const { cataloged, uncataloged } = await queryBatchIntelligence(options.apiUrl, dependencies);

  // 3. On-demand scanning fallback for uncataloged packages
  for (const uncPkg of uncataloged) {
    const scanned = await scanAndPollPackage(options.apiUrl, uncPkg, options.timeoutMs, options.json);
    if (scanned) {
      cataloged.set(uncPkg.toLowerCase(), scanned);
    }
  }

  if (!options.json && uncataloged.length > 0) {
    // Clear spinner line
    process.stdout.write('                                                                               \r');
  }

  // 4. Audit Evaluation
  const auditResults: DependencyAuditResult[] = [];
  let failedCount = 0;

  for (const dep of dependencies) {
    const rawLookup = cataloged.get(dep.name.toLowerCase());
    const slugLookup = cataloged.get(dep.name.toLowerCase().replace(/^@[^/]+\//, ''));
    const info = rawLookup || slugLookup;

    const failureReasons: string[] = [];
    let passed = true;

    if (!info) {
      auditResults.push({
        package: dep.name,
        version: dep.version || dep.rawSpec || 'latest',
        ecosystem: dep.ecosystem,
        safetyScore: null,
        verdict: 'UNCATALOGED',
        license: 'Unknown',
        cves: [],
        riskReasons: [],
        alternatives: [],
        passed: true, // Uncataloged does not fail build by default unless explicitly configured
        failureReasons: [],
      });
      continue;
    }

    const score = typeof info.safety_score === 'number' ? info.safety_score : null;
    const rawVerdict = String(info.verdict || 'caution').toUpperCase();
    const verdict = (rawVerdict === 'HEALTHY' || rawVerdict === 'SAFE') ? 'SAFE' : (rawVerdict === 'RISKY' ? 'RISKY' : 'CAUTION');
    const license = info.license || info.license_spdx || 'Unknown';
    const cves = info.cves || [];
    const riskReasons = info.risk_reasons || [];
    const alternatives = (info.direct_alternatives || []).map((alt: any) => ({
      name: alt.name,
      slug: alt.slug,
      score: alt.score || alt.safety_score,
      verdict: alt.verdict,
      repo: alt.repo,
    }));

    // Policy Rule 1: Min Score Check
    if (score !== null && score < options.minScore) {
      passed = false;
      failureReasons.push(`Safety score (${score.toFixed(1)}) is below minimum threshold (${options.minScore})`);
    }

    // Policy Rule 2: Fail-on Level Check
    if (options.failOn === 'risky' && verdict === 'RISKY') {
      passed = false;
      failureReasons.push(`Verdict is RISKY (Critical vulnerabilities or unmaintained repository)`);
    } else if (options.failOn === 'caution' && (verdict === 'RISKY' || verdict === 'CAUTION')) {
      passed = false;
      failureReasons.push(`Verdict is ${verdict} (Elevated risk or caution threshold breached)`);
    } else if (options.failOn === 'cve' && cves.length > 0) {
      passed = false;
      failureReasons.push(`Contains ${cves.length} active CVE advisory(s)`);
    }

    if (!passed) {
      failedCount++;
    }

    auditResults.push({
      package: dep.name,
      version: dep.version || info.version || 'latest',
      ecosystem: dep.ecosystem,
      safetyScore: score,
      verdict,
      license,
      cves,
      riskReasons,
      alternatives,
      passed,
      failureReasons,
    });
  }

  // 5. Output: Machine-readable JSON
  if (options.json) {
    const jsonOutput = {
      manifest: detection.filePath,
      ecosystem: detection.type,
      policy: {
        min_score: options.minScore,
        fail_on: options.failOn,
      },
      summary: {
        total: auditResults.length,
        passed: auditResults.length - failedCount,
        failed: failedCount,
        status: failedCount > 0 ? 'FAILED' : 'PASSED',
      },
      results: auditResults.map((r) => ({
        package: r.package,
        version: r.version,
        ecosystem: r.ecosystem,
        safety_score: r.safetyScore,
        verdict: r.verdict,
        license: r.license,
        passed: r.passed,
        cve_count: r.cves.length,
        failure_reasons: r.failureReasons,
        alternatives: r.alternatives,
      })),
      remediations: auditResults
        .filter((r) => !r.passed)
        .map((r) => ({
          package: r.package,
          version: r.version,
          failure_reasons: r.failureReasons,
          recommended_alternatives: r.alternatives,
        })),
    };

    console.log(JSON.stringify(jsonOutput, null, 2));
    process.exit(failedCount > 0 ? 1 : 0);
  }

  // 6. Visual Output: Formatted ASCII Table
  const tableHeaders = [
    `${colors.bold}Package${colors.reset}`,
    `${colors.bold}Version${colors.reset}`,
    `${colors.bold}Safety Score${colors.reset}`,
    `${colors.bold}Verdict${colors.reset}`,
    `${colors.bold}License Status${colors.reset}`,
  ];

  const tableRows = auditResults.map((r) => {
    // Format score
    let scoreDisplay = `${colors.dim}N/A${colors.reset}`;
    if (r.safetyScore !== null) {
      if (r.safetyScore >= 75) {
        scoreDisplay = `${colors.green}${r.safetyScore.toFixed(1)} / 100${colors.reset}`;
      } else if (r.safetyScore >= 50) {
        scoreDisplay = `${colors.yellow}${r.safetyScore.toFixed(1)} / 100${colors.reset}`;
      } else {
        scoreDisplay = `${colors.red}${colors.bold}${r.safetyScore.toFixed(1)} / 100${colors.reset}`;
      }
    }

    // Format verdict
    let verdictDisplay = `${colors.dim}UNCATALOGED${colors.reset}`;
    if (r.verdict === 'SAFE') {
      verdictDisplay = `${colors.green}${colors.bold}SAFE${colors.reset}`;
    } else if (r.verdict === 'CAUTION') {
      verdictDisplay = `${colors.yellow}${colors.bold}CAUTION${colors.reset}`;
    } else if (r.verdict === 'RISKY') {
      verdictDisplay = `${colors.red}${colors.bold}RISKY${colors.reset}`;
    }

    // Format package name with failure indicator
    const pkgDisplay = r.passed
      ? `${r.package}`
      : `${colors.red}${colors.bold}✖ ${r.package}${colors.reset}`;

    return [
      pkgDisplay,
      r.version,
      scoreDisplay,
      verdictDisplay,
      r.license,
    ];
  });

  console.log(renderAsciiTable(tableHeaders, tableRows));
  console.log('');

  // 7. Remediation Guide for Failures
  if (failedCount > 0) {
    console.log(`${colors.bgRed}${colors.white}${colors.bold} ✖ POLICY VIOLATION: ${failedCount} DEPENDENCIES FAILED AUDIT ${colors.reset}\n`);

    console.log(`${colors.bold}${colors.cyan}REMEDIATION GUIDE:${colors.reset}`);
    for (const failed of auditResults.filter((r) => !r.passed)) {
      console.log(`\n• ${colors.bold}${colors.red}${failed.package}@${failed.version}${colors.reset}`);
      for (const reason of failed.failureReasons) {
        console.log(`  ${colors.red}↳ Violation:${colors.reset} ${reason}`);
      }

      if (failed.riskReasons.length > 0) {
        console.log(`  ${colors.dim}↳ Observed Risks:${colors.reset} ${failed.riskReasons.slice(0, 2).join('; ')}`);
      }

      if (failed.alternatives.length > 0) {
        console.log(`  ${colors.green}${colors.bold}↳ Recommended Safer Alternatives:${colors.reset}`);
        for (const alt of failed.alternatives) {
          const altScore = alt.score ? ` (Score: ${alt.score}, ${alt.verdict?.toUpperCase() || 'SAFE'})` : '';
          console.log(`    - ${colors.cyan}${alt.name}${colors.reset}${altScore} → https://safeopensource.org/tools/${alt.slug}`);
        }
      } else {
        console.log(`  ${colors.dim}↳ Recommendation: Pin to patched release, isolate in container, or review safe alternatives at safeopensource.org${colors.reset}`);
      }
    }

    console.log(`\n${colors.red}${colors.bold}Audit failed:${colors.reset} ${failedCount} of ${auditResults.length} dependencies violate security invariants. Exiting with code 1.\n`);
    process.exit(1);
  }

  // 8. Success Summary
  console.log(`${colors.green}${colors.bold}✔ AUDIT PASSED:${colors.reset} All ${auditResults.length} dependencies meet SafeOpenSource security thresholds.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`\n${colors.red}Fatal error during execution:${colors.reset} ${err.message}\n`);
  process.exit(1);
});
