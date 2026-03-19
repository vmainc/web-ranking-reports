import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getClaudeConfig } from '~/server/utils/claude'

interface CompetitorItem {
  domain: string
  reason?: string
}

const COMPETITORS_KEY = 'rank_tracking_competitors'

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

function extractJsonObject(text: string): string {
  let jsonText = text.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[a-zA-Z]*\s*/u, '').replace(/```$/u, '').trim()
  }
  const firstBrace = jsonText.indexOf('{')
  const lastBrace = jsonText.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1)
  }
  return jsonText
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const site = await assertSiteOwnership(pb, siteId, userId)

  const config = await getClaudeConfig(pb)
  if (!config) {
    throw createError({
      statusCode: 503,
      message: 'Claude is not configured. Add Claude API settings in Admin → Integrations first.',
    })
  }

  let keywords: string[] = []
  try {
    const rows = await pb.collection('rank_keywords').getFullList<{ keyword?: string }>({
      filter: `site = "${siteId}"`,
      sort: '-updated',
    })
    keywords = rows
      .map((r) => (r.keyword || '').trim())
      .filter(Boolean)
      .slice(0, 25)
  } catch {
    keywords = []
  }

  const siteDomain = normalizeDomain((site as { domain?: string }).domain || '')
  if (!siteDomain) throw createError({ statusCode: 400, message: 'Site domain is missing.' })

  const endpoint = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages'
  const prompt = [
    'Find likely SEO competitors for this business domain.',
    `Target domain: ${siteDomain}`,
    keywords.length ? `Known target keywords:\n- ${keywords.join('\n- ')}` : 'No seed keywords provided.',
    '',
    'Return only JSON with this exact shape:',
    '{ "competitors": [ { "domain": "example.com", "reason": "short reason" } ] }',
    'Rules:',
    '- Return 5-8 competitors.',
    '- Use only root domains (no protocol, path, or www prefix).',
    '- Exclude the target domain itself.',
    '- Keep reason under 120 chars.',
    '- Output JSON only; no markdown.',
  ].join('\n')

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.api_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw createError({
      statusCode: 502,
      message: `Claude research failed: ${res.status} ${text.slice(0, 200)}`,
    })
  }

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> }
  const content = (data.content ?? [])
    .filter((c) => c?.type === 'text' && c?.text)
    .map((c) => c.text as string)
    .join('\n')
    .trim()

  let competitors: CompetitorItem[] = []
  try {
    const parsed = JSON.parse(extractJsonObject(content)) as { competitors?: Array<{ domain?: string; reason?: string }> }
    competitors = (parsed.competitors ?? [])
      .map((item) => ({
        domain: normalizeDomain(item.domain || ''),
        reason: (item.reason || '').trim(),
      }))
      .filter((item) => item.domain && item.domain.includes('.') && item.domain !== siteDomain)
  } catch {
    competitors = []
  }

  // De-duplicate and cap list
  const seen = new Set<string>()
  competitors = competitors.filter((c) => {
    if (seen.has(c.domain)) return false
    seen.add(c.domain)
    return true
  }).slice(0, 8)

  // Save to app_settings by site id
  let row: { id: string; value?: Record<string, unknown> } | null = null
  try {
    row = await pb
      .collection('app_settings')
      .getFirstListItem<{ id: string; value?: Record<string, unknown> }>(`key="${COMPETITORS_KEY}"`)
  } catch {
    row = null
  }

  const current: Record<string, unknown> = row?.value && typeof row.value === 'object' ? { ...row.value } : {}
  current[siteId] = competitors

  if (row) {
    await pb.collection('app_settings').update(row.id, { value: current })
  } else {
    await pb.collection('app_settings').create({ key: COMPETITORS_KEY, value: current })
  }

  return { competitors, count: competitors.length }
})

