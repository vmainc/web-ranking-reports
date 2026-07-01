import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { getClaudeConfig } from '~/server/utils/claude'
import { analyzeCrmImportColumns } from '~/server/utils/crmImportAi'

const MAX_ROWS = 2000
const MAX_SAMPLE = 8

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await requireCrmOwnerId(pb, userId)

  const body = (await readBody(event).catch(() => ({}))) as {
    headers?: string[]
    rows?: Record<string, string>[]
  }

  const headers = Array.isArray(body.headers) ? body.headers.filter((h) => typeof h === 'string' && h.trim()) : []
  const rows = Array.isArray(body.rows) ? body.rows : []

  if (!headers.length) {
    throw createError({ statusCode: 400, message: 'No columns found in upload.' })
  }
  if (rows.length > MAX_ROWS) {
    throw createError({ statusCode: 400, message: `Import limited to ${MAX_ROWS} rows per file.` })
  }

  const config = await getClaudeConfig(pb)
  const result = await analyzeCrmImportColumns(config, {
    headers,
    sampleRows: rows.slice(0, MAX_SAMPLE),
  })

  return {
    mapping: result.mapping,
    notes: result.notes,
    usedAi: result.usedAi,
    rowCount: rows.length,
  }
})
