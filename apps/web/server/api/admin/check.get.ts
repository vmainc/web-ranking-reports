import { getUserIdFromRequest, getAdminPb, adminAuth } from '~/server/utils/pbServer'

const ADMIN_EMAIL = 'admin@vma.agency'

export default defineEventHandler(async (event) => {
  try {
    const userId = await getUserIdFromRequest(event)
    if (!userId) {
      return {
        allowed: false,
        hint: 'No valid session. Log in at /auth/login, then open Admin again.',
      }
    }
    const pb = getAdminPb()
    await adminAuth(pb)
    const userRecord = await pb.collection('users').getOne<{ email?: string }>(userId)
    const userEmail = userRecord?.email?.toLowerCase?.().trim()
    const allowed = userEmail === ADMIN_EMAIL.toLowerCase()
    return {
      allowed,
      hint: !allowed && userEmail
        ? 'Only admin@vma.agency can access this page.'
        : undefined,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Admin check error:', e)
    let hint = 'On the VPS edit infra/.env, then run: docker compose -f infra/docker-compose.yml up -d --force-recreate web'
    if (msg.includes('not set') || msg.includes('PB_ADMIN')) {
      hint = 'Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD in infra/.env on the VPS (same login as https://pb.webrankingreports.com/_/). Then restart the web container.'
    } else if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('network') || msg.includes('Failed to fetch')) {
      hint = 'Web container cannot reach PocketBase. In infra/.env on the VPS set PB_URL=http://pb:8090 (internal Docker URL). Then restart the web container.'
    } else if (msg.includes('Invalid') || msg.includes('401') || msg.includes('403')) {
      hint = 'PocketBase admin login failed. Check PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD in infra/.env match the account at https://pb.webrankingreports.com/_/'
    } else {
      hint += ` Error: ${msg.slice(0, 200)}`
    }
    return { allowed: false, hint }
  }
})
