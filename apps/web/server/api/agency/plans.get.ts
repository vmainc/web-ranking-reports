import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

/** Latest saved plan for the current user (for optional reload). */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  try {
    const list = await pb.collection('agency_plans').getList(1, 1, {
      filter: `user = "${userId}"`,
      sort: '-created',
    })
    const row = list.items[0]
    if (!row) return { plan: null }

    return {
      plan: {
        id: row.id,
        input_data: row.input_data,
        goals: row.goals,
        strategy: row.strategy,
        execution_plan: row.execution_plan,
        quick_wins: row.quick_wins,
        created: row.created,
      },
    }
  } catch {
    return { plan: null }
  }
})
