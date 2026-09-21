#!/usr/bin/env node

/**
 * Generates production-grade credentials for SafeOpenSource /admin control plane:
 * - ADMIN_PASSWORD_HASH (Argon2id)
 * - ADMIN_API_KEY (32-byte secure hex token for Agent write)
 * - ADMIN_API_KEY_READONLY (32-byte secure hex token for Agent read-only)
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { hash } from '@node-rs/argon2';

const args = process.argv.slice(2);
let password = '';
let email = 'admin@safeopensource.org';
let writeEnv = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--password' && args[i + 1]) {
    password = args[i + 1];
    i++;
  } else if (args[i] === '--email' && args[i + 1]) {
    email = args[i + 1];
    i++;
  } else if (args[i] === '--write-env') {
    writeEnv = true;
  }
}

if (!password) {
  password = crypto.randomBytes(16).toString('base64url');
}

async function run() {
  const passwordHash = await hash(password);
  const adminApiKey = crypto.randomBytes(32).toString('hex');
  const adminApiKeyReadonly = crypto.randomBytes(32).toString('hex');

  const envLines = [
    `# SafeOpenSource Admin Control Plane Credentials`,
    `ADMIN_EMAIL=${email}`,
    `ADMIN_PASSWORD_HASH=${passwordHash}`,
    `ADMIN_API_KEY=${adminApiKey}`,
    `ADMIN_API_KEY_READONLY=${adminApiKeyReadonly}`,
  ];

  if (writeEnv) {
    const envPath = path.join(process.cwd(), '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf-8');
      // Strip old admin env vars if present
      content = content
        .split('\n')
        .filter((l) => !l.startsWith('ADMIN_') && !l.includes('Control Plane Credentials'))
        .join('\n')
        .trim();
      if (content) content += '\n\n';
    }
    content += envLines.join('\n') + '\n';
    fs.writeFileSync(envPath, content, 'utf-8');
    console.log(`\n✓ Successfully wrote credentials to .env (verified git-ignored)`);
  } else {
    console.log(`\n--- COPY TO YOUR .env FILE ---`);
    console.log(envLines.join('\n'));
    console.log(`------------------------------`);
  }

  console.log(`\nOperator Credentials:`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`\nAgent API Keys:`);
  console.log(`  Read/Write: ${adminApiKey}`);
  console.log(`  Read-Only:  ${adminApiKeyReadonly}\n`);
}

run().catch((err) => {
  console.error('Failed to generate admin secrets:', err);
  process.exit(1);
});
