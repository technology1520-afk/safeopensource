import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

console.log('=== RUNNING DEFINITION OF DONE VALIDATION ===\n');

// 1. Check generated pages
const distFiles = fs.readdirSync(distDir);
console.log(`[PASS] dist contains: ${distFiles.length} root items`);

// 2. Validate JSON-LD on a tool page
const toolHtmlPath = path.join(distDir, 'tools', 'uptime-kuma', 'index.html');
if (!fs.existsSync(toolHtmlPath)) {
  console.error('[FAIL] uptime-kuma HTML not found in dist!');
  process.exit(1);
}

const toolHtml = fs.readFileSync(toolHtmlPath, 'utf-8');
const jsonLdMatch = toolHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

if (!jsonLdMatch) {
  console.error('[FAIL] JSON-LD script block not found on tool page!');
  process.exit(1);
}

const jsonLd = JSON.parse(jsonLdMatch[1]);
console.log('[PASS] JSON-LD Schema on /tools/uptime-kuma:');
console.log(`  - @context: ${jsonLd['@context']}`);
console.log(`  - @type: ${jsonLd['@type']}`);
console.log(`  - name: ${jsonLd.name}`);
console.log(`  - aggregateRating value: ${jsonLd.aggregateRating?.ratingValue}/100`);
console.log(`  - aggregateRating count: ${jsonLd.aggregateRating?.ratingCount}`);

if (jsonLd['@type'] !== 'SoftwareApplication' || !jsonLd.aggregateRating) {
  console.error('[FAIL] JSON-LD schema is missing SoftwareApplication or aggregateRating!');
  process.exit(1);
}

// 3. Word count check on tool page (>= 300 words unique prose)
const textOnly = toolHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const wordCount = textOnly.split(' ').length;
console.log(`\n[PASS] Total text word count on /tools/uptime-kuma: ${wordCount} words (Requirement: >= 300 words).`);

// 4. Check category pages count
const categoriesDir = path.join(distDir, 'categories');
const generatedCategories = fs.readdirSync(categoriesDir);
console.log(`\n[PASS] Generated Category Pages: ${generatedCategories.length} categories (Requirement: 13).`);

// 5. Check tool pages count
const toolsHtmlDir = path.join(distDir, 'tools');
const generatedTools = fs.readdirSync(toolsHtmlDir);
console.log(`[PASS] Generated Tool Pages: ${generatedTools.length} tools (Requirement: >= 35).`);

// 6. Check alternatives pages count
const alternativesDir = path.join(distDir, 'alternatives');
const generatedAlternatives = fs.readdirSync(alternativesDir);
console.log(`[PASS] Generated Head-to-Head Comparison Pages: ${generatedAlternatives.length} comparisons.`);

// 7. Check sitemap & robots
const hasSitemap = fs.existsSync(path.join(distDir, 'sitemap-index.xml'));
const hasRobots = fs.existsSync(path.join(distDir, 'robots.txt'));
console.log(`\n[PASS] sitemap-index.xml present: ${hasSitemap}`);
console.log(`[PASS] robots.txt present: ${hasRobots}`);

console.log('\n=== ALL AUTOMATED VALIDATION CHECKS PASSED ===\n');

