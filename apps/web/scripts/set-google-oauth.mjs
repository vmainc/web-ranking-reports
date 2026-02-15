#!/usr/bin/env node
/**
 * Write Google OAuth settings (client_id, client_secret, redirect_uri) to PocketBase app_settings.
 *
 * Usage:
 *   cd apps/web
 *   POCKETBASE_URL=https://pb.webrankingreports.com \
 *   POCKETBASE_ADMIN_EMAIL=admin@yourdomain.com \
 *   POCKETBASE_ADMIN_PASSWORD=yourPassword \
 *   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com \
 *   GOOGLE_CLIENT_SECRET=yourSecret \
 *   node scripts/set-google-oauth.mjs
 *
 * Optional: APP_URL (default https://webrankingreports.com) sets redirect_uri to ${APP_URL}/api/google/callback
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

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = (process.env.APP_URL || 'https://webrankingreports.com').replace(/\/+$/, '');

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD.');
  process.exit(1);
}
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  process.exit(1);
}

const redirect_uri = `${APP_URL}/api/google/callback`;
const value = { client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri };

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
    console.error('Admin login failed. HTTP', res.status, body);
    process.exit(1);
  }
  pb.authStore.save(data.token, data.admin);
}

async function main() {
  await adminAuth();

  const list = await pb.collection('app_settings').getFullList({ filter: 'key="google_oauth"' });
  if (list.length > 0) {
    await pb.collection('app_settings').update(list[0].id, { value });
    console.log('Updated google_oauth in app_settings.');
  } else {
    await pb.collection('app_settings').create({ key: 'google_oauth', value });
    console.log('Created google_oauth in app_settings.');
  }
  console.log('redirect_uri:', redirect_uri);
  console.log('Done. Add this exact URI to Google Cloud Console → Credentials → Authorized redirect URIs');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
