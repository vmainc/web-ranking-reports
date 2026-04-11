import { getMethod, getRouterParam, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getClaudeConfig } from '~/server/utils/claude'
import { claudeTextCompletion, extractJsonObject } from '~/server/utils/contentGeneratorAi'

export interface ContentSuggestionItem {
  title: string
  angle: string
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
  const siteName = String((site as { name?: string }).name || '').trim() || 'this site'
  const siteDomain = String((site as { domain?: string }).domain || '').trim()

  const config = await getClaudeConfig(pb)
  if (!config) {
    throw createError({
      statusCode: 503,
      message: 'Claude is not configured. Add Claude API settings in Admin → Integrations first.',
    })
  }

  const userPrompt = [
    'You are an SEO content strategist.',
    `Brand / site name: ${siteName}`,
    siteDomain ? `Site domain: ${siteDomain}` : '',
    `Seed keyword or topic: ${seedKeyword}`,
    '',
    'Propose distinct article ideas that could rank for this topic cluster. Each idea should target a slightly different search intent or angle.',
    '',
    'Return ONLY JSON in this exact shape:',
    '{',
    '  "suggestions": [',
    '    { "title": "compelling working title", "angle": "1–2 sentences: audience, intent, and what the piece will cover" }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- suggestions: exactly 8 items.',
    '- Titles: specific, not generic; under 90 characters.',
    '- Angles: concrete; no duplicate titles.',
    '- No markdown; JSON only.',
  ]
    .filter(Boolean)
    .join('\n')

  let text: string
  try {
    text = await claudeTextCompletion(config, {
      max_tokens: 2500,
      temperature: 0.45,
      user: userPrompt,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Claude request failed'
    throw createError({ statusCode: 502, message: msg })
  }

  let suggestions: ContentSuggestionItem[] = []
  try {
    const parsed = JSON.parse(extractJsonObject(text)) as { suggestions?: Array<{ title?: string; angle?: string }> }
    const raw = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    const seen = new Set<string>()
    suggestions = raw
      .map((s) => ({
        title: (s.title || '').trim(),
        angle: (s.angle || '').trim(),
      }))
      .filter((s) => s.title.length > 0)
      .filter((s) => {
        const k = s.title.toLowerCase()
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      .slice(0, 8)
  } catch {
    suggestions = []
  }

  if (suggestions.length === 0) {
    throw createError({
      statusCode: 502,
      message: 'Could not parse content suggestions. Try again with a different seed keyword.',
    })
  }

  return { seedKeyword, suggestions }
})
