import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'
import { sanitizeTemplateSections } from '~/utils/reportLayoutPresets'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { name?: string; sections?: unknown }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) throw createError({ statusCode: 400, message: 'Template name required' })

  const partial = sanitizeTemplateSections(body.sections)
  if (!partial?.length) throw createError({ statusCode: 400, message: 'Valid sections array required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const { ownerId } = await getWorkspaceContext(pb, userId)

  const row = await pb.collection('report_layout_templates').create({
    user: ownerId,
    name,
    sections: partial,
  })

  return { id: row.id, name: row.name, sections: row.sections }
})
