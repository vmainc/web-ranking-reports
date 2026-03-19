import { getMethod, getRouterParam, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getClaudeConfig } from '~/server/utils/claude'

interface CompetitorItem {
  domain: string
  reason?: string
}

interface SharedKeywordItem {
  keyword: string
  reason?: string
}

interface ResearchResult {
  seedKeyword: string
  competitors: CompetitorItem[]
  sharedKeywords: SharedKeywordItem[]
  updatedAt: string
}

const RESEARCH_KEY = 'site_research'

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

  const body = (await readBody(event).catch(() => ({}))) as { seedKeyword?: string }
  const seedKeyword = (body.seedKeyword || '').trim()
  if (!seedKeyword) throw createError({ statusCode: 400, message: 'Seed keyword is required.' })
  if (seedKeyword.length > 120) throw createError({ statusCode: 400, message: 'Seed keyword is too long.' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const site = await assertSiteOwnership(pb, siteId, userId)
  const siteDomain = normalizeDomain((site as { domain?: string }).domain || '')
  if (!siteDomain) throw createError({ statusCode: 400, message: 'Site domain is missing.' })

  const config = await getClaudeConfig(pb)
  if (!config) {
    throw createError({
      statusCode: 503,
      message: 'Claude is not configured. Add Claude API settings in Admin → Integrations first.',
    })
  }

  const endpoint = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages'
  const prompt = [
    'You are an SEO market researcher.',
    `Target site domain: ${siteDomain}`,
    `Seed keyword/topic: ${seedKeyword}`,
    '',
    'Task:',
    '1) Suggest likely SEO competitor domains for this target + keyword.',
    '2) Suggest important shared keywords these competitors likely target for this topic.',
    '',
    'Return ONLY JSON in this exact shape:',
    '{',
    '  "competitors": [',
    '    { "domain": "example.com", "reason": "short reason" }',
    '  ],',
    '  "sharedKeywords": [',
    '    { "keyword": "keyword phrase", "reason": "short reason" }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- competitors: 5-8 items, root domains only, exclude target domain.',
    '- sharedKeywords: 15-25 items, specific and relevant to the seed keyword.',
    '- Keep each reason under 120 chars.',
    '- No markdown; JSON only.',
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
      max_tokens: 2500,
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
  let sharedKeywords: SharedKeywordItem[] = []
  try {
    const parsed = JSON.parse(extractJsonObject(content)) as {
      competitors?: Array<{ domain?: string; reason?: string }>
      sharedKeywords?: Array<{ keyword?: string; reason?: string }>
    }

    const seenDomains = new Set<string>()
    competitors = (parsed.competitors ?? [])
      .map((item) => ({
        domain: normalizeDomain(item.domain || ''),
        reason: (item.reason || '').trim(),
      }))
      .filter((item) => item.domain && item.domain.includes('.') && item.domain !== siteDomain)
      .filter((item) => {
        if (seenDomains.has(item.domain)) return false
        seenDomains.add(item.domain)
        return true
      })
      .slice(0, 8)

    const seenKeywords = new Set<string>()
    sharedKeywords = (parsed.sharedKeywords ?? [])
      .map((item) => ({
        keyword: (item.keyword || '').trim(),
        reason: (item.reason || '').trim(),
      }))
      .filter((item) => item.keyword.length > 0)
      .filter((item) => {
        const key = item.keyword.toLowerCase()
        if (seenKeywords.has(key)) return false
        seenKeywords.add(key)
        return true
      })
      .slice(0, 30)
  } catch {
    competitors = []
    sharedKeywords = []
  }

  const result: ResearchResult = {
    seedKeyword,
    competitors,
    sharedKeywords,
    updatedAt: new Date().toISOString(),
  }

  let row: { id: string; value?: Record<string, unknown> } | null = null
  try {
    row = await pb
      .collection('app_settings')
      .getFirstListItem<{ id: string; value?: Record<string, unknown> }>(`key="${RESEARCH_KEY}"`)
  } catch {
    row = null
  }

  const current: Record<string, unknown> = row?.value && typeof row.value === 'object' ? { ...row.value } : {}
  current[siteId] = result

  if (row) {
    await pb.collection('app_settings').update(row.id, { value: current })
  } else {
    await pb.collection('app_settings').create({ key: RESEARCH_KEY, value: current })
  }

  return { research: result }
})

