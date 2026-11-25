import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { getClaudeConfig } from '~/server/utils/claude'
import { assertProposalOwned } from '~/server/utils/proposals'
import { listServicePackages } from '~/server/utils/proposalServicePackages'
import { buildProposalDeckFallback } from '~/lib/proposalDeck'
import { finalizeDeckForEngagement } from '~/lib/proposalDeckTemplate'
import {
  type ProposalEngagementType,
  buildProposalAssistSystemPrompt,
  buildProposalAssistUserPrompt,
  parseProposalAssistJson,
} from '~/server/utils/proposalAssistAI'

const ENGAGEMENT_TYPES = new Set<ProposalEngagementType>([
  'monthly_marketing',
  'website_project',
  'website_plus_retainer',
  'add_on',
])

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing proposal id' })

  const body = (await readBody(event).catch(() => ({}))) as {
    engagement_type?: string
    notes?: string
  }
  const engagement_type = String(body.engagement_type || '').trim() as ProposalEngagementType
  if (!ENGAGEMENT_TYPES.has(engagement_type)) {
    throw createError({ statusCode: 400, message: 'Invalid engagement type' })
  }
  const notes = body.notes != null ? String(body.notes).trim().slice(0, 4000) : ''

  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const proposal = await assertProposalOwned(pb, id, crmOwnerId)
  const expanded = await pb.collection('proposals').getOne(id, { expand: 'client' })
  const client = (expanded as { expand?: { client?: { name?: string; company?: string; mailing_city?: string; mailing_state?: string } } })
    .expand?.client
  const clientName = String(client?.company || client?.name || '').trim()
  const clientLocation = [client?.mailing_city, client?.mailing_state].filter(Boolean).join(', ')

  const config = await getClaudeConfig(pb)
  if (!config) {
    throw createError({
      statusCode: 503,
      message: 'Claude is not configured. Set CLAUDE_API_KEY on the server or add Claude in Admin → Integrations.',
    })
  }

  const packages = await listServicePackages(pb, crmOwnerId, { activeOnly: true })
  const input = {
    engagement_type,
    client_name: clientName,
    client_location: clientLocation || null,
    proposal_title: String((proposal as { title?: string }).title || ''),
    notes: notes || null,
    packages,
  }

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
      temperature: 0.35,
      system: buildProposalAssistSystemPrompt(),
      messages: [{ role: 'user', content: buildProposalAssistUserPrompt(input) }],
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

  try {
    const parsed = parseProposalAssistJson(rawText)
    const rawDeck =
      parsed.deck ||
      buildProposalDeckFallback({
        title: parsed.title,
        intro_html: parsed.intro_html,
        client_name: clientName,
        client_location: clientLocation || null,
        currency: String((proposal as { currency?: string }).currency || 'USD'),
        items: parsed.line_items.map((it) => ({
          name: it.name,
          description: it.description,
          unit_price: it.unit_price,
          billing_interval: it.billing_interval,
        })),
      })
    const suggestion = {
      ...parsed,
      deck: finalizeDeckForEngagement(rawDeck, engagement_type, clientName),
    }
    return { suggestion, engagement_type }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Parse error'
    throw createError({
      statusCode: 502,
      message: `Could not parse Claude proposal draft. ${msg}`,
    })
  }
})