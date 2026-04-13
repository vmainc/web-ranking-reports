import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = (await readBody(event).catch(() => ({}))) as {
    name?: string | null
    email?: string | null
    phone?: string | null
    website?: string | null
    audit_url?: string | null
    pdf_report_url?: string | null
    notes?: string | null
  }

  const pb = getAdminPb()
  await adminAuth(pb)

  const existing = await pb.collection('seoptimer_leads').getOne(id).catch(() => null)
  if (!existing || (existing as { user?: string }).user !== userId) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const patch: Record<string, unknown> = {}
  const trim = (s: string | null | undefined) => {
    if (s === undefined) return undefined
    if (s === null) return null
    const t = String(s).trim()
    return t.length ? t : null
  }

  if ('name' in body) patch.name = trim(body.name)
  if ('email' in body) patch.email = trim(body.email)
  if ('phone' in body) patch.phone = trim(body.phone)
  if ('website' in body) patch.website = trim(body.website)
  if ('audit_url' in body) patch.audit_url = trim(body.audit_url)
  if ('pdf_report_url' in body) patch.pdf_report_url = trim(body.pdf_report_url)
  if ('notes' in body) patch.notes = trim(body.notes)

  const updated = await pb.collection('seoptimer_leads').update(id, patch)
  return updated
})
