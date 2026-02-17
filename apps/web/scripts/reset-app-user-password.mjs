#!/usr/bin/env node
/**
 * Reset an app user's password (e.g. admin@vma.agency) using PocketBase admin credentials.
 * Use this when you've lost the app login password but still have PocketBase admin access.
 *
 * Usage:
 *   cd apps/web
 *   POCKETBASE_URL=https://pb.webrankingreports.com \
 *   POCKETBASE_ADMIN_EMAIL=your-pb-admin@email.com \
 *   POCKETBASE_ADMIN_PASSWORD=your-pb-admin-password \
 *   USER_EMAIL=admin@vma.agency \
 *   NEW_PASSWORD='new-secure-password' \
 *   node scripts/reset-app-user-password.mjs
 *
 * Reads from apps/web/.env if variables are not set in the environment.
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
const USER_EMAIL = process.env.USER_EMAIL;
const NEW_PASSWORD = process.env.NEW_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD (PocketBase admin login).');
  process.exit(1);
}
if (!USER_EMAIL || !NEW_PASSWORD) {
  console.error('Set USER_EMAIL (e.g. admin@vma.agency) and NEW_PASSWORD.');
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
    console.error('PocketBase admin login failed. HTTP', res.status, res.statusText);
    console.error('Response:', body || '(empty)');
    process.exit(1);
  }
  pb.authStore.save(data.token, data.admin);
}

async function main() {
  await adminAuth();

  const filter = `email="${USER_EMAIL.replace(/"/g, '""')}"`;
  const list = await pb.collection('users').getList(1, 1, { filter });
  if (!list.items || list.items.length === 0) {
    console.error('No user found with email:', USER_EMAIL);
    process.exit(1);
  }
  const user = list.items[0];
  await pb.collection('users').update(user.id, {
    password: NEW_PASSWORD,
    passwordConfirm: NEW_PASSWORD,
  });
  console.log('Password updated for', USER_EMAIL);
  console.log('Sign in at the app with this email and the new password.');
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
