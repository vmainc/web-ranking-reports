import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'

function normalizeSiteDomain(raw: string): string {
  let s = raw.trim().toLowerCase()
  if (!s) return ''
  s = s.replace(/^https?:\/\//i, '')
  const slash = s.indexOf('/')
  if (slash >= 0) s = s.slice(0, slash)
  const colon = s.indexOf(':')
  if (colon >= 0) s = s.slice(0, colon)
  return s.trim()
}

function isValidDomain(host: string): boolean {
  if (!host || host.length > 253) return false
  if (/[\s/\\]/.test(host)) return false
  const labels = host.split('.')
  if (labels.length < 2) return false
  for (const label of labels) {
    if (!label || label.length > 63) return false
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) return false
  }
  return true
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = event.context.params?.id
  if (!siteId) throw createError({ statusCode: 400, message: 'Missing site id' })

  const body = (await readBody(event).catch(() => ({}))) as { name?: unknown; domain?: unknown }

  const updates: Record<string, string> = {}
  if (body.name !== undefined) {
    if (typeof body.name !== 'string') throw createError({ statusCode: 400, message: 'Invalid name.' })
    const name = body.name.trim()
    if (!name) throw createError({ statusCode: 400, message: 'Name cannot be empty.' })
    if (name.length > 160) throw createError({ statusCode: 400, message: 'Name is too long.' })
    updates.name = name
  }
  if (body.domain !== undefined) {
    if (typeof body.domain !== 'string') throw createError({ statusCode: 400, message: 'Invalid domain.' })
    const domain = normalizeSiteDomain(body.domain)
    if (!domain) throw createError({ statusCode: 400, message: 'Domain cannot be empty.' })
    if (!isValidDomain(domain)) {
      throw createError({
        statusCode: 400,
        message: 'Enter a valid hostname (e.g. example.com). Remove https:// and paths.',
      })
    }
    updates.domain = domain
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'Provide name and/or domain to update.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteAccess(pb, siteId, userId, true)

  await pb.collection('sites').update(siteId, updates)
  const site = await pb.collection('sites').getOne(siteId)

  return { site, canWrite: true }
})
