import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import type { AgencyPlannerInput, AgencyPlannerResult } from '~/server/utils/agencyPlannerAI'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    input?: AgencyPlannerInput
    plan?: AgencyPlannerResult
    raw_response?: string
    raw_claude?: string
  }

  if (!body.input || !body.plan) {
    throw createError({ statusCode: 400, message: 'input and plan are required' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)

  try {
    const rawText = (body.raw_response ?? body.raw_claude ?? '').slice(0, 100000) || null
    const row = await pb.collection('agency_plans').create({
      user: userId,
      input_data: body.input,
      goals: body.plan.goals,
      strategy: body.plan.strategy,
      execution_plan: body.plan.execution_plan,
      quick_wins: Array.isArray(body.plan.quick_wins) ? body.plan.quick_wins : [],
      raw_response: rawText,
    })
    return { id: row.id, saved: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('could not find') || msg.includes('404') || msg.includes('unknown collection')) {
      throw createError({
        statusCode: 503,
        message:
          'agency_plans collection is missing. Run: node apps/web/scripts/add-agency-plans-collection.mjs (and node apps/web/scripts/patch-agency-plans-raw-response.mjs if upgrading from raw_claude).',
      })
    }
    throw createError({ statusCode: 500, message: msg.slice(0, 200) })
  }
})
