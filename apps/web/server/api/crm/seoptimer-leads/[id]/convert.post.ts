import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, requireCrmOwnerId } from '~/server/utils/workspace'

function deriveClientName(
  bodyName: string | undefined,
  lead: {
    name?: string | null
    email?: string | null
    website?: string | null
  },
): string {
  const fromBody = bodyName?.trim()
  if (fromBody) return fromBody
  const n = lead.name?.trim()
  if (n) return n
  const em = lead.email?.trim()
  if (em) return em.split('@')[0] || em
  const web = lead.website?.trim()
  if (web) {
    try {
      const u = web.startsWith('http') ? new URL(web) : new URL(`https://${web}`)
      return u.hostname.replace(/^www\./, '') || web
    } catch {
      return web
    }
  }
  return 'SEOptimer lead'
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = (await readBody(event).catch(() => ({}))) as {
    name?: string
    company?: string | null
    notes?: string | null
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)

  const lead = await pb.collection('seoptimer_leads').getOne(id).catch(() => null)
  if (!lead || !crmRowOwnedByUser(lead as { user?: unknown }, crmOwnerId)) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const L = lead as {
    crm_client?: string | null
    name?: string | null
    email?: string | null
    phone?: string | null
    website?: string | null
    notes?: string | null
    pdf_report_url?: string | null
    audit_url?: string | null
    payload_json?: Record<string, unknown> | null
  }

  if (L.crm_client) {
    throw createError({ statusCode: 400, message: 'This lead is already linked to the CRM' })
  }

  const name = deriveClientName(body.name, L)
  const company = body.company !== undefined ? (body.company?.trim() || null) : L.website?.trim() || null

  const noteParts: string[] = []
  if (body.notes !== undefined) {
    const n = body.notes?.trim()
    if (n) noteParts.push(n)
  } else if (L.notes?.trim()) {
    noteParts.push(L.notes.trim())
  }
  if (L.pdf_report_url?.trim()) noteParts.push(`SEOptimer PDF: ${L.pdf_report_url.trim()}`)
  if (L.audit_url?.trim()) noteParts.push(`Audit: ${L.audit_url.trim()}`)
  const notes = noteParts.length ? noteParts.join('\n\n') : null

  const client = await pb.collection('crm_clients').create({
    user: crmOwnerId,
    name,
    email: L.email?.trim() || null,
    phone: L.phone?.trim() || null,
    company,
    status: 'lead',
    pipeline_stage: 'new',
    source: 'SEOptimer',
    notes,
  })

  await pb.collection('seoptimer_leads').update(id, {
    crm_client: client.id,
    converted_at: new Date().toISOString(),
  })

  return { client }
})
