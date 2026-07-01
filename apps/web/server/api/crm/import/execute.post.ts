import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { escPbFilterId, requireCrmOwnerId } from '~/server/utils/workspace'
import { assertPlanLimit } from '~/server/utils/planGuard'
import { mapRowToContact, type CrmColumnMapping } from '~/lib/crmImportExport'

const MAX_ROWS = 2000

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)

  const body = (await readBody(event).catch(() => ({}))) as {
    rows?: Record<string, string>[]
    mapping?: CrmColumnMapping
    defaultStatus?: 'lead' | 'client' | 'archived'
    skipDuplicates?: boolean
  }

  const rows = Array.isArray(body.rows) ? body.rows : []
  const mapping = body.mapping && typeof body.mapping === 'object' ? body.mapping : {}
  const defaultStatus =
    body.defaultStatus && ['lead', 'client', 'archived'].includes(body.defaultStatus)
      ? body.defaultStatus
      : 'lead'
  const skipDuplicates = body.skipDuplicates !== false

  if (!rows.length) throw createError({ statusCode: 400, message: 'No rows to import.' })
  if (rows.length > MAX_ROWS) {
    throw createError({ statusCode: 400, message: `Import limited to ${MAX_ROWS} rows per file.` })
  }

  const mapped = rows
    .map((row) => mapRowToContact(row, mapping, { status: defaultStatus }))
    .filter((r): r is NonNullable<typeof r> => r != null)

  if (!mapped.length) {
    throw createError({
      statusCode: 400,
      message: 'No valid rows found. Map at least a name column (first/last or full name).',
    })
  }

  let existingEmails = new Set<string>()
  if (skipDuplicates) {
    try {
      const existing = await pb.collection('crm_clients').getFullList<{ email?: string }>({
        filter: `user = "${escPbFilterId(crmOwnerId)}"`,
      })
      existingEmails = new Set(
        existing.map((r) => (r.email || '').trim().toLowerCase()).filter((e) => e.length > 0),
      )
    } catch {
      existingEmails = new Set()
    }
  }

  const toCreate = skipDuplicates
    ? mapped.filter((r) => {
        const email = (r.email || '').trim().toLowerCase()
        if (email && existingEmails.has(email)) return false
        if (email) existingEmails.add(email)
        return true
      })
    : mapped

  if (!toCreate.length) {
    return { created: 0, skipped: mapped.length, errors: [] as string[] }
  }

  await assertPlanLimit(pb, crmOwnerId, 'contacts', toCreate.length)

  let created = 0
  const errors: string[] = []

  for (const row of toCreate) {
    try {
      await pb.collection('crm_clients').create({
        user: crmOwnerId,
        name_prefix: row.name_prefix || null,
        first_name: row.first_name || null,
        last_name: row.last_name || null,
        name: row.name,
        email: row.email || null,
        phone: row.phone || null,
        business_phone: row.business_phone || null,
        cell_phone: row.cell_phone || null,
        company: row.company || null,
        status: row.status,
        pipeline_stage: row.pipeline_stage,
        source: row.source || null,
        notes: row.notes || null,
        next_step: row.next_step || null,
        mailing_address_line1: row.mailing_address_line1 || null,
        mailing_address_line2: row.mailing_address_line2 || null,
        mailing_city: row.mailing_city || null,
        mailing_state: row.mailing_state || null,
        mailing_postal_code: row.mailing_postal_code || null,
        mailing_country: row.mailing_country || null,
        tags_json: row.tags_json ?? null,
      })
      created++
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Create failed'
      errors.push(`${row.name}: ${msg}`)
      if (errors.length >= 20) break
    }
  }

  return { created, skipped: mapped.length - created, errors }
})
