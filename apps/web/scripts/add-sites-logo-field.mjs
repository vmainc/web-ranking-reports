#!/usr/bin/env node
/**
 * Add the "logo" file field to the PocketBase "sites" collection.
 * Run once if the sites collection was created before the logo field existed.
 *
 * Usage:
 *   cd apps/web
 *   POCKETBASE_URL=https://pb.webrankingreports.com POCKETBASE_ADMIN_EMAIL=... POCKETBASE_ADMIN_PASSWORD=... node scripts/add-sites-logo-field.mjs
 *
 * Or set PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD (or use .env in apps/web).
 */

import PocketBase from 'pocketbase';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

function loadEnv() {
  const dir = dirname(fileURLToPath(import.meta.url));
  const envPath = join(dir, '..', '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}
loadEnv();

const PB_URL = (process.env.POCKETBASE_URL || process.env.PB_URL || 'http://127.0.0.1:8090').replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || process.env.PB_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD (or PB_* equivalents).');
  process.exit(1);
}

const pb = new PocketBase(PB_URL);

async function adminAuth() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const body = await res.text();
  let data = {};
  try {
    data = body ? JSON.parse(body) : {};
  } catch (_) {}
  if (!res.ok) {
    console.error('Admin login failed. HTTP', res.status, body || '(empty)');
    process.exit(1);
  }
  pb.authStore.save(data.token, data.admin);
}

async function main() {
  await adminAuth();

  const collections = await pb.collections.getFullList();
  const sites = collections.find((c) => c.name === 'sites');
  if (!sites) {
    console.error('No "sites" collection found. Create it first (e.g. run create-collections.mjs).');
    process.exit(1);
  }

  const full = await pb.collections.getOne(sites.id);
  const schema = full.schema ?? full.fields ?? [];
  const schemaArray = Array.isArray(schema) ? [...schema] : [];

  if (schemaArray.some((f) => f && f.name === 'logo')) {
    console.log('Sites collection already has a "logo" field. Nothing to do.');
    process.exit(0);
  }

  schemaArray.push({
    name: 'logo',
    type: 'file',
    required: false,
    options: { maxSelect: 1, maxSize: 2097152 },
  });

  await pb.collections.update(sites.id, { schema: schemaArray });
  console.log('Added "logo" file field to the sites collection.');
}

main().catch((e) => {
  console.error('Error:', e.message || e);
  process.exit(1);
});
