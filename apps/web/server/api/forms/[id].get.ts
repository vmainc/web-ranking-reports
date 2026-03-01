import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const formId = getRouterParam(event, 'id')
  if (!formId) throw createError({ statusCode: 400, message: 'Form id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const form = await pb.collection('lead_forms').getOne(formId)
  const rec = form as { status?: string; name?: string; fields_json?: unknown; conditional_json?: unknown; settings_json?: { successMessage?: string; redirectUrl?: string } }
  if (rec.status !== 'published') throw createError({ statusCode: 404, message: 'Form not found' })
  return {
    id: form.id,
    name: rec.name,
    fields: rec.fields_json ?? [],
    conditional: rec.conditional_json ?? [],
    successMessage: rec.settings_json?.successMessage ?? 'Thank you!',
    redirectUrl: rec.settings_json?.redirectUrl ?? '',
  }
})
