#!/usr/bin/env node
/**
 * Sync Google OAuth client_id + client_secret into PocketBase app_settings (key=google_oauth).
 * Keeps Analytics redirect_uri. Use after rotating the Google client secret.
 *
 *   POCKETBASE_URL=https://pb.webrankingreports.com \
 *   PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... \
 *   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... \
 *   node apps/web/scripts/sync-google-oauth-secret.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
loadEnvFile(join(scriptDir, '..', '.env'))
loadEnvFile(join(scriptDir, '..', '..', '..', 'infra', '.env'))

const PB_URL = (process.env.POCKETBASE_URL || process.env.PB_URL || 'http://127.0.0.1:8090').replace(/\/+$/, '')
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || process.env.PB_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || process.env.PB_ADMIN_PASSWORD
const CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim()
const CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || '').trim()
const APP_URL = (process.env.APP_URL || 'https://webrankingreports.com').replace(/\/+$/, '')

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD.')
  process.exit(1)
}
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.')
  process.exit(1)
}

async function main() {
  const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!authRes.ok) {
    console.error('Admin login failed', await authRes.text())
    process.exit(1)
  }
  const { token } = await authRes.json()
  const listRes = await fetch(
    `${PB_URL}/api/collections/app_settings/records?filter=${encodeURIComponent('key="google_oauth"')}&perPage=5`,
    { headers: { Authorization: token } },
  )
  const list = await listRes.json()
  const item = (list.items || [])[0]
  const prev = item?.value && typeof item.value === 'object' ? item.value : {}
  const value = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: prev.redirect_uri || `${APP_URL}/api/google/callback`,
    ...(Array.isArray(prev.scopes) ? { scopes: prev.scopes } : {}),
  }

  if (item?.id) {
    const res = await fetch(`${PB_URL}/api/collections/app_settings/records/${item.id}`, {
      method: 'PATCH',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })
    if (!res.ok) {
      console.error('Update failed', await res.text())
      process.exit(1)
    }
    console.log('Updated app_settings.google_oauth (client id/secret). Analytics redirect_uri kept:', value.redirect_uri)
  } else {
    const res = await fetch(`${PB_URL}/api/collections/app_settings/records`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'google_oauth', value }),
    })
    if (!res.ok) {
      console.error('Create failed', await res.text())
      process.exit(1)
    }
    console.log('Created app_settings.google_oauth')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
