import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const { ownerId } = await getWorkspaceContext(pb, userId)

  try {
    const list = await pb.collection('report_layout_templates').getFullList<{
      id: string
      name: string
      sections: unknown
      created: string
    }>({
      filter: `user = "${ownerId.replace(/"/g, '\\"')}"`,
      sort: '-created',
    })
    return {
      templates: list.map((r) => ({
        id: r.id,
        name: r.name,
        sections: r.sections,
        created: r.created,
      })),
    }
  } catch {
    return { templates: [] as { id: string; name: string; sections: unknown; created: string }[] }
  }
})
