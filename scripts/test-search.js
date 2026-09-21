import Fuse from 'fuse.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.join(__dirname, '..', 'src', 'data', 'tools');

const tools = fs.readdirSync(toolsDir).map((f) => JSON.parse(fs.readFileSync(path.join(toolsDir, f), 'utf-8')));

const fuse = new Fuse(tools, {
  keys: [
    { name: 'name', weight: 0.45 },
    { name: 'slug', weight: 0.35 },
    { name: 'category', weight: 0.1 },
    { name: 'tagline', weight: 0.1 }
  ],
  threshold: 0.48,
  distance: 100,
  minMatchCharLength: 2
});

const queries = ['upptime', 'vaultwardn', 'jelifyn', 'nextclowd', 'homassistant'];

console.log('Testing typo-tolerant fuzzy search:\n');
let allPassed = true;

for (const q of queries) {
  const results = fuse.search(q);
  const first = results[0]?.item?.slug;
  console.log(`Query "${q}" -> Top Result: "${first}" (matched: ${results.length > 0})`);
  if (!first) {
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\nAll typo search tests passed successfully!');
} else {
  console.error('\nSome tests failed.');
  process.exit(1);
}
