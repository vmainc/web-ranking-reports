import { getQuery, setHeader } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { escPbFilterId, requireCrmOwnerId } from '~/server/utils/workspace'
import { CRM_EXPORT_COLUMNS, rowsToCsv } from '~/lib/crmImportExport'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)

  const query = getQuery(event)
  const status = query.status as string | undefined
  const pipelineStage = query.pipeline_stage as string | undefined
  const search = query.search as string | undefined

  let filter = `user = "${escPbFilterId(crmOwnerId)}"`
  if (status && ['lead', 'client', 'archived'].includes(status)) filter += ' && status = "' + status + '"'
  if (pipelineStage && ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'].includes(pipelineStage)) {
    filter += ' && pipeline_stage = "' + pipelineStage + '"'
  }
  if (search && String(search).trim()) {
    const term = String(search).trim().replace(/"/g, '\\"')
    filter += ' && (name ~ "' + term + '" || email ~ "' + term + '" || company ~ "' + term + '")'
  }

  const list = await pb.collection('crm_clients').getFullList<Record<string, unknown>>({
    filter,
    sort: 'name',
  })

  const exportRows = list.map((r) => {
    const row: Record<string, unknown> = {}
    for (const col of CRM_EXPORT_COLUMNS) {
      if (col.key === 'tags_json') {
        const tags = r.tags_json
        row.tags_json = Array.isArray(tags) ? tags.join('; ') : ''
      } else if (col.key === 'status' && r.status === 'client') {
        row.status = 'customer'
      } else {
        row[col.key] = r[col.key] ?? ''
      }
    }
    return row
  })

  const headers = CRM_EXPORT_COLUMNS.map((c) => c.label)
  const csvBody = rowsToCsv(
    headers,
    exportRows.map((r) => {
      const out: Record<string, unknown> = {}
      CRM_EXPORT_COLUMNS.forEach((col, i) => {
        out[headers[i]] = r[col.key]
      })
      return out
    }),
  )

  const date = new Date().toISOString().slice(0, 10)
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="crm-contacts-${date}.csv"`)
  return '\uFEFF' + csvBody
})
