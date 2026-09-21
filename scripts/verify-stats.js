import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.join(__dirname, '..', 'src', 'data', 'tools');

console.log('--- RECOMPUTING TELEMETRY STATS FROM DATASET ---');

const files = fs.readdirSync(toolsDir).filter(f => f.endsWith('.json'));
console.log(`Found ${files.length} tool JSON files in ${toolsDir}`);

let healthyCount = 0;
let cautionCount = 0;
let riskyCount = 0;
let totalScore = 0;

for (const file of files) {
  const tool = JSON.parse(fs.readFileSync(path.join(toolsDir, file), 'utf8'));
  if (tool.verdict === 'healthy') healthyCount++;
  else if (tool.verdict === 'caution') cautionCount++;
  else if (tool.verdict === 'risky') riskyCount++;
  totalScore += tool.safety_score;
}

const totalTools = files.length;
const flaggedCount = cautionCount + riskyCount;
const nominalPercentage = ((healthyCount / totalTools) * 100).toFixed(1);
const avgScore = (totalScore / totalTools).toFixed(1);

console.log(`Total Watched: ${totalTools}`);
console.log(`Healthy: ${healthyCount}`);
console.log(`Caution: ${cautionCount}`);
console.log(`Risky: ${riskyCount}`);
console.log(`Flagged: ${flaggedCount}`);
console.log(`Nominal Percentage: ${nominalPercentage}%`);
console.log(`Average Safety Score: ${avgScore}`);

if (healthyCount + cautionCount + riskyCount !== totalTools) {
  console.error('ERROR: Verdict counts do not add up to total tools!');
  process.exit(1);
}

// Assert no component contains hardcoded old fake stats
const componentsDir = path.join(__dirname, '..', 'src', 'components');
const compFiles = fs.readdirSync(componentsDir).filter(f => f.endsWith('.astro') || f.endsWith('.tsx'));

let errors = 0;
for (const comp of compFiles) {
  const content = fs.readFileSync(path.join(componentsDir, comp), 'utf8');
  if (content.includes('87.2% NOMINAL')) {
    console.error(`ERROR in ${comp}: Contains hardcoded '87.2% NOMINAL' instead of dataset math!`);
    errors++;
  }
  if (content.includes('DIRECTION B:')) {
    console.error(`ERROR in ${comp}: Contains portfolio easter egg 'DIRECTION B:'!`);
    errors++;
  }
  if (content.includes('FREQ: 1420 MHZ')) {
    console.error(`ERROR in ${comp}: Contains ungrounded flavor text 'FREQ: 1420 MHZ'!`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`Stats verification failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log('✓ All telemetry stats verified and corroborated by dataset!');
}
