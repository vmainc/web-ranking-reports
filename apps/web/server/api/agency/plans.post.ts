import { ClientResponseError } from 'pocketbase'
import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import type { AgencyPlannerInput, AgencyPlannerResult } from '~/server/utils/agencyPlannerAI'

const MISSING_COLLECTION_HINT =
  'Agency Planner database table is missing on the server. On the VPS run: ./infra/run-agency-plans-collection.sh'

function sanitizePlanForStorage(plan: AgencyPlannerResult): AgencyPlannerResult {
  const goals = (Array.isArray(plan.goals) ? plan.goals : [])
    .filter((g) => g && typeof g.title === 'string' && g.title.trim())
    .map((g) => ({
      title: g.title.trim().slice(0, 500),
      measurable: typeof g.measurable === 'string' ? g.measurable.trim().slice(0, 500) : undefined,
    }))
  const ep = plan.execution_plan && typeof plan.execution_plan === 'object' ? plan.execution_plan : ({} as AgencyPlannerResult['execution_plan'])
  const pickWeek = (key: keyof AgencyPlannerResult['execution_plan']) => {
    const v = ep[key]
    if (!Array.isArray(v)) return [] as string[]
    return v.filter((x): x is string => typeof x === 'string' && x.trim()).map((s) => s.trim().slice(0, 2000))
  }
  const strategy =
    typeof plan.strategy === 'string'
      ? plan.strategy.trim().slice(0, 20000)
      : typeof plan.strategy === 'object' && plan.strategy != null
        ? JSON.stringify(plan.strategy).slice(0, 20000)
        : ''
  const quick_wins = (Array.isArray(plan.quick_wins) ? plan.quick_wins : [])
    .filter((x): x is string => typeof x === 'string' && x.trim())
    .map((s) => s.trim().slice(0, 2000))
  return {
    goals,
    strategy,
    execution_plan: {
      week1: pickWeek('week1'),
      week2: pickWeek('week2'),
      week3: pickWeek('week3'),
      week4: pickWeek('week4'),
    },
    quick_wins,
  }
}

function pbErrorDetail(e: unknown): string {
  if (e instanceof ClientResponseError) {
    const data = e.response?.data as { message?: string; data?: Record<string, unknown> } | undefined
    if (data?.message) return data.message
    try {
      if (data?.data) return JSON.stringify(data.data).slice(0, 300)
    } catch {
      // ignore
    }
    if (e.message && e.message !== 'ClientResponseError') return e.message
    return `PocketBase error (${e.status})`
  }
  return e instanceof Error ? e.message : String(e)
}

function isMissingAgencyPlansCollection(e: unknown): boolean {
  if (e instanceof ClientResponseError && e.status === 404) return true
  const msg = pbErrorDetail(e).toLowerCase()
  return (
    msg.includes('agency_plans') &&
    (msg.includes('missing') || msg.includes("wasn't found") || msg.includes('not found') || msg.includes('unknown collection'))
  )
}

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

  const plan = sanitizePlanForStorage(body.plan)
  if (!plan.goals.length || !plan.strategy) {
    throw createError({ statusCode: 400, message: 'Plan is missing goals or strategy. Generate the plan again.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)

  const rawText = (body.raw_response ?? body.raw_claude ?? '').slice(0, 100000) || null
  const base = {
    user: userId,
    input_data: body.input,
    goals: plan.goals,
    strategy: plan.strategy,
    execution_plan: plan.execution_plan,
    quick_wins: plan.quick_wins,
  }

  const attempts: Record<string, unknown>[] = [
    rawText != null ? { ...base, raw_response: rawText } : { ...base },
    rawText != null ? { ...base, raw_claude: rawText } : null,
    { ...base },
  ].filter((x): x is Record<string, unknown> => x != null)

  let lastError: unknown
  for (const payload of attempts) {
    try {
      const row = await pb.collection('agency_plans').create(payload)
      return { id: row.id, saved: true }
    } catch (e) {
      lastError = e
      if (isMissingAgencyPlansCollection(e)) {
        throw createError({ statusCode: 503, message: MISSING_COLLECTION_HINT })
      }
      // Try next payload shape (e.g. legacy raw_claude field or without raw text).
      continue
    }
  }

  const detail = pbErrorDetail(lastError).slice(0, 300)
  if (isMissingAgencyPlansCollection(lastError)) {
    throw createError({ statusCode: 503, message: MISSING_COLLECTION_HINT })
  }
  if (lastError instanceof ClientResponseError && lastError.status === 400) {
    throw createError({ statusCode: 400, message: detail || 'Could not save plan (validation).' })
  }
  throw createError({ statusCode: 500, message: detail || 'Could not save plan.' })
})
