import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

const MAX_KEYWORDS = 100

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const body = (await readBody(event).catch(() => ({}))) as { keyword?: string }
  const keyword = typeof body?.keyword === 'string' ? body.keyword.trim() : ''
  if (!keyword) throw createError({ statusCode: 400, message: 'keyword is required' })
  if (keyword.length > 700) throw createError({ statusCode: 400, message: 'keyword too long' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const existing = await pb.collection('rank_keywords').getFullList<{ id: string }>({
    filter: `site = "${siteId}"`,
  })
  if (existing.length >= MAX_KEYWORDS) {
    throw createError({
      statusCode: 400,
      message: `Maximum ${MAX_KEYWORDS} keywords per site. Remove some before adding more.`,
    })
  }

  const duplicate = existing.find(
    (r) => (r as { keyword?: string }).keyword?.toLowerCase() === keyword.toLowerCase()
  )
  if (duplicate) {
    throw createError({ statusCode: 400, message: 'This keyword is already added.' })
  }

  const created = await pb.collection('rank_keywords').create({
    site: siteId,
    keyword,
  })
  return created
})
