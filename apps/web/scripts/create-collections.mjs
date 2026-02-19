#!/usr/bin/env node
/**
 * Create PocketBase collections (sites, integrations, reports) via Admin API.
 * Run once after PocketBase is up and you have an admin account.
 *
 * Usage:
 *   cd apps/web
 *   node scripts/create-collections.mjs
 * (Reads POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD from .env or env.)
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

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD (and optionally POCKETBASE_URL).');
  process.exit(1);
}

const pb = new PocketBase(PB_URL);

async function adminAuth() {
  const url = `${PB_URL}/api/admins/auth-with-password`;
  const res = await fetch(url, {
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
    console.error('Admin login failed. HTTP', res.status, res.statusText);
    console.error('Response:', body || '(empty)');
    console.error('\nUse the email and password for the PocketBase Admin UI (http://127.0.0.1:8090/_/).');
    process.exit(1);
  }
  pb.authStore.save(data.token, data.admin);
}

async function main() {
  try {
    await adminAuth();
  } catch (e) {
    console.error('Admin login failed:', e.message);
    if (e.cause) console.error('Cause:', e.cause);
    process.exit(1);
  }

  const collections = await pb.collections.getFullList();
  const hasSites = collections.some((c) => c.name === 'sites');
  const hasIntegrations = collections.some((c) => c.name === 'integrations');
  const hasReports = collections.some((c) => c.name === 'reports');
  const hasAppSettings = collections.some((c) => c.name === 'app_settings');
  const hasDashboardSettings = collections.some((c) => c.name === 'site_dashboard_settings');
  const hasRankKeywords = collections.some((c) => c.name === 'rank_keywords');
  if (hasSites && hasIntegrations && hasReports && hasAppSettings && hasDashboardSettings && hasRankKeywords) {
    console.log('All collections already exist. Skipping.');
    return;
  }

  const usersCol = collections.find((c) => c.name === 'users');
  if (!usersCol) {
    console.error('Could not find "users" collection. Is PocketBase set up?');
    process.exit(1);
  }

  let sites = collections.find((c) => c.name === 'sites');
  if (!sites) {
  sites = await pb.collections.create({
    name: 'sites',
    type: 'base',
    listRule: '@request.auth.id != "" && user = @request.auth.id',
    viewRule: '@request.auth.id != "" && user = @request.auth.id',
    createRule: '@request.auth.id != ""',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true } },
      { name: 'name', type: 'text', required: true, options: { min: 1, max: 255 } },
      { name: 'domain', type: 'text', required: true, options: { min: 1, max: 255 } },
      { name: 'logo', type: 'file', required: false, options: { maxSelect: 1, maxSize: 2097152 } },
    ],
    indexes: ['CREATE INDEX idx_sites_user ON sites (user)'],
  });
  console.log('Created collection: sites');
  }
  const sitesColId = sites.id;

  const token = pb.authStore.token;

  if (!hasIntegrations) {
    const integrationsBody = {
      name: 'integrations',
      type: 'base',
      listRule: '@request.auth.id != "" && site.user = @request.auth.id',
      viewRule: '@request.auth.id != "" && site.user = @request.auth.id',
      createRule: '@request.auth.id != "" && site.user = @request.auth.id',
      updateRule: 'site.user = @request.auth.id',
      deleteRule: 'site.user = @request.auth.id',
      schema: [
        { name: 'site', type: 'relation', required: true, options: { collectionId: sitesColId, maxSelect: 1, cascadeDelete: true } },
        { name: 'provider', type: 'select', required: true, options: { values: ['google_analytics', 'google_search_console', 'lighthouse', 'google_business_profile', 'google_ads', 'woocommerce', 'bing_webmaster'], maxSelect: 1 } },
        { name: 'status', type: 'select', required: true, options: { values: ['disconnected', 'pending', 'connected', 'error'], maxSelect: 1 } },
        { name: 'connected_at', type: 'date', required: false },
        { name: 'config_json', type: 'json', required: false, options: { maxSize: 2000000 } },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_integrations_site_provider ON integrations (site, provider)'],
    };
    const r1 = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(integrationsBody),
    });
    if (!r1.ok) {
      const t = await r1.text();
      throw new Error(`integrations: ${r1.status} ${t}`);
    }
    console.log('Created collection: integrations');
  }

  if (!hasReports) {
    const reportsBody = {
      name: 'reports',
      type: 'base',
      listRule: '@request.auth.id != "" && site.user = @request.auth.id',
      viewRule: '@request.auth.id != "" && site.user = @request.auth.id',
      createRule: '@request.auth.id != "" && site.user = @request.auth.id',
      updateRule: 'site.user = @request.auth.id',
      deleteRule: 'site.user = @request.auth.id',
      schema: [
        { name: 'site', type: 'relation', required: true, options: { collectionId: sitesColId, maxSelect: 1, cascadeDelete: true } },
        { name: 'type', type: 'text', required: true, options: { min: 1, max: 64 } },
        { name: 'period_start', type: 'date', required: true },
        { name: 'period_end', type: 'date', required: true },
        { name: 'payload_json', type: 'json', required: false, options: { maxSize: 2000000 } },
      ],
      indexes: ['CREATE INDEX idx_reports_site ON reports (site)'],
    };
    const r2 = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(reportsBody),
    });
    if (!r2.ok) {
      const t = await r2.text();
      throw new Error(`reports: ${r2.status} ${t}`);
    }
    console.log('Created collection: reports');
  }

  if (!hasAppSettings) {
    const appSettingsBody = {
      name: 'app_settings',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      schema: [
        { name: 'key', type: 'text', required: true, options: { min: 1, max: 255 } },
        { name: 'value', type: 'json', required: false, options: { maxSize: 2000000 } },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_app_settings_key ON app_settings (key)'],
    };
    const r3 = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
      body: JSON.stringify(appSettingsBody),
    });
    if (!r3.ok) {
      const t = await r3.text();
      throw new Error(`app_settings: ${r3.status} ${t}`);
    }
    console.log('Created collection: app_settings');
  }

  if (!hasDashboardSettings) {
    const dashboardBody = {
      name: 'site_dashboard_settings',
      type: 'base',
      listRule: '@request.auth.id != "" && site.user = @request.auth.id',
      viewRule: '@request.auth.id != "" && site.user = @request.auth.id',
      createRule: '@request.auth.id != "" && site.user = @request.auth.id',
      updateRule: 'site.user = @request.auth.id',
      deleteRule: 'site.user = @request.auth.id',
      schema: [
        { name: 'site', type: 'relation', required: true, options: { collectionId: sitesColId, maxSelect: 1, cascadeDelete: true } },
        { name: 'layout_json', type: 'json', required: true, options: { maxSize: 500000 } },
        { name: 'updated_at', type: 'date', required: false },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_site_dashboard_settings_site ON site_dashboard_settings (site)'],
    };
    const r4 = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
      body: JSON.stringify(dashboardBody),
    });
    if (!r4.ok) {
      const t = await r4.text();
      throw new Error(`site_dashboard_settings: ${r4.status} ${t}`);
    }
    console.log('Created collection: site_dashboard_settings');
  }

  if (!hasRankKeywords) {
    const rankKeywordsBody = {
      name: 'rank_keywords',
      type: 'base',
      listRule: '@request.auth.id != "" && site.user = @request.auth.id',
      viewRule: '@request.auth.id != "" && site.user = @request.auth.id',
      createRule: '@request.auth.id != "" && site.user = @request.auth.id',
      updateRule: 'site.user = @request.auth.id',
      deleteRule: 'site.user = @request.auth.id',
      schema: [
        { name: 'site', type: 'relation', required: true, options: { collectionId: sitesColId, maxSelect: 1, cascadeDelete: true } },
        { name: 'keyword', type: 'text', required: true, options: { min: 1, max: 700 } },
        { name: 'last_result_json', type: 'json', required: false, options: { maxSize: 100000 } },
      ],
      indexes: ['CREATE INDEX idx_rank_keywords_site ON rank_keywords (site)'],
    };
    const r5 = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
      body: JSON.stringify(rankKeywordsBody),
    });
    if (!r5.ok) {
      const t = await r5.text();
      throw new Error(`rank_keywords: ${r5.status} ${t}`);
    }
    console.log('Created collection: rank_keywords');
  }

  console.log('Done. Refresh PocketBase Admin → Collections to see all collections.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
