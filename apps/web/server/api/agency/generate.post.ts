import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getClaudeConfig } from '~/server/utils/claude'
import {
  type AgencyPlannerInput,
  buildAgencyPlannerSystemPrompt,
  buildAgencyPlannerUserPrompt,
  formatAgencyDataForPrompt,
  parseAgencyPlannerJson,
} from '~/server/utils/agencyPlannerAI'

function normalizeInput(body: Record<string, unknown>): AgencyPlannerInput {
  const agencyType = String(body.agencyType || '')
  if (!['seo', 'ppc', 'web_design', 'full_service'].includes(agencyType)) {
    throw createError({ statusCode: 400, message: 'Invalid agency type' })
  }
  const primaryGoal = String(body.primaryGoal || '')
  if (!['more_clients', 'retention', 'improve_results', 'scale_operations'].includes(primaryGoal)) {
    throw createError({ statusCode: 400, message: 'Invalid primary goal' })
  }
  const clientCount = Number(body.clientCount)
  if (!Number.isFinite(clientCount) || clientCount < 0 || clientCount > 100000) {
    throw createError({ statusCode: 400, message: 'Invalid client count' })
  }
  const monthlyRevenue = body.monthlyRevenue != null ? String(body.monthlyRevenue).trim() : ''
  const notes = body.notes != null ? String(body.notes).trim().slice(0, 4000) : ''
  return {
    agencyType: agencyType as AgencyPlannerInput['agencyType'],
    primaryGoal: primaryGoal as AgencyPlannerInput['primaryGoal'],
    clientCount: Math.floor(clientCount),
    monthlyRevenue: monthlyRevenue || null,
    notes: notes || null,
  }
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>
  const input = normalizeInput(body)

  const pb = getAdminPb()
  await adminAuth(pb)
  const config = await getClaudeConfig(pb)
  if (!config) {
    throw createError({
      statusCode: 503,
      message: 'Claude is not configured. Set CLAUDE_API_KEY on the server or add Claude in Admin → Integrations.',
    })
  }

  const agencyBlock = formatAgencyDataForPrompt(input)
  const endpoint = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages'

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.api_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      temperature: 0.4,
      system: buildAgencyPlannerSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: buildAgencyPlannerUserPrompt(agencyBlock),
        },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw createError({
      statusCode: 502,
      message: `Claude request failed: ${res.status} ${text.slice(0, 240)}`,
    })
  }

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> }
  const rawText = (data.content ?? [])
    .filter((c) => c?.type === 'text' && c?.text)
    .map((c) => c.text as string)
    .join('\n')
    .trim()

  let plan
  try {
    plan = parseAgencyPlannerJson(rawText)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Parse error'
    throw createError({
      statusCode: 502,
      message: `Could not parse AI plan. ${msg}`,
    })
  }

  const raw_response = rawText.slice(0, 120000)
  return { input, plan, raw_response, raw_claude: raw_response }
})
