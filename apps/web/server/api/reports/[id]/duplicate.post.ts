import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { REPORT_BUILDER_PAYLOAD_KEY } from '~/types/reportBuilder'

function withCopySuffix(raw: string): string {
  const base = raw.replace(/\s*\(copy\)$/i, '').trim()
  return base ? `${base} (copy)` : 'Report (copy)'
}

function augmentDuplicatePayload(payload: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const cloned =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (structuredClone(payload) as Record<string, unknown>)
      : {}

  const rb = cloned[REPORT_BUILDER_PAYLOAD_KEY]
  if (rb && typeof rb === 'object' && !Array.isArray(rb)) {
    const rbo = rb as Record<string, unknown>
    if (typeof rbo.title === 'string' && rbo.title.trim()) {
      rbo.title = withCopySuffix(rbo.title)
      cloned.name = rbo.title
      return cloned
    }
  }

  if (typeof cloned.name === 'string' && cloned.name.trim()) {
    cloned.name = withCopySuffix(cloned.name)
  }

  return cloned
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const sourceId = getRouterParam(event, 'id')
  if (!sourceId) throw createError({ statusCode: 400, message: 'Report id required' })

  const body = (await readBody(event).catch(() => ({}))) as { siteId?: string }
  const targetSiteId = body?.siteId
  if (!targetSiteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const source = await pb.collection('reports').getOne(sourceId)
  const sourceSiteId = typeof source.site === 'string' ? source.site : (source.site as { id?: string })?.id
  if (!sourceSiteId) throw createError({ statusCode: 404, message: 'Report not found' })

  await assertSiteOwnership(pb, sourceSiteId, userId)
  await assertSiteOwnership(pb, targetSiteId, userId)

  const payloadRaw = (source as { payload_json?: unknown }).payload_json
  const payload =
    payloadRaw && typeof payloadRaw === 'object' && !Array.isArray(payloadRaw)
      ? (payloadRaw as Record<string, unknown>)
      : undefined

  const newPayload = augmentDuplicatePayload(payload)

  const now = new Date().toISOString().slice(0, 10)
  const srcRow = source as unknown as Record<string, unknown>
  const type = typeof srcRow.type === 'string' ? srcRow.type : 'full'
  const periodStart = typeof srcRow.period_start === 'string' ? srcRow.period_start : now
  const periodEnd = typeof srcRow.period_end === 'string' ? srcRow.period_end : now

  const report = await pb.collection('reports').create({
    site: targetSiteId,
    type,
    period_start: periodStart,
    period_end: periodEnd,
    payload_json: newPayload,
  })

  return {
    report: {
      id: report.id,
      site: report.site,
      type: report.type,
      period_start: (report as { period_start?: string }).period_start,
      period_end: (report as { period_end?: string }).period_end,
      created: (report as { created?: string }).created,
    },
  }
})
