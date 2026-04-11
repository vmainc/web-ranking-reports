import { getMethod, getRouterParam, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getClaudeConfig } from '~/server/utils/claude'
import { claudeTextCompletion, extractJsonObject } from '~/server/utils/contentGeneratorAi'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const body = (await readBody(event).catch(() => ({}))) as {
    seedKeyword?: string
    suggestionTitle?: string
    suggestionAngle?: string
  }
  const seedKeyword = (body.seedKeyword || '').trim()
  const suggestionTitle = (body.suggestionTitle || '').trim()
  const suggestionAngle = (body.suggestionAngle || '').trim()

  if (!seedKeyword) throw createError({ statusCode: 400, message: 'Seed keyword is required.' })
  if (!suggestionTitle) throw createError({ statusCode: 400, message: 'Suggestion title is required.' })
  if (seedKeyword.length > 120 || suggestionTitle.length > 200) {
    throw createError({ statusCode: 400, message: 'Input is too long.' })
  }

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

  const systemPrompt =
    'You are an expert SEO content writer. Write original, helpful articles with clear structure, scannable headings, and natural keyword use. ' +
    'Avoid fluff, keyword stuffing, and fake statistics. Use Markdown: # for title, ## / ### for sections, bullet lists where useful.'

  const userPrompt = [
    `Brand / site context: ${siteName}${siteDomain ? ` (${siteDomain})` : ''}`,
    `Primary seed keyword / topic cluster: ${seedKeyword}`,
    '',
    'Article assignment:',
    `Working title: ${suggestionTitle}`,
    suggestionAngle ? `Editorial angle / brief: ${suggestionAngle}` : '',
    '',
    'Write one complete article suitable for publishing on the brand site.',
    '',
    'Return ONLY JSON (no markdown fences) in this exact shape:',
    '{',
    '  "metaTitle": "≤60 chars, compelling SERP title including primary keyword naturally",',
    '  "metaDescription": "≤155 chars, benefit-led",',
    '  "articleMarkdown": "full article in Markdown; start with # same as working title or refined title; include intro, H2 sections, FAQ if helpful, and a short conclusion with CTA"',
    '}',
  ]
    .filter(Boolean)
    .join('\n')

  let text: string
  try {
    text = await claudeTextCompletion(config, {
      max_tokens: 8000,
      temperature: 0.35,
      system: systemPrompt,
      user: userPrompt,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Claude request failed'
    throw createError({ statusCode: 502, message: msg })
  }

  try {
    const parsed = JSON.parse(extractJsonObject(text)) as {
      metaTitle?: string
      metaDescription?: string
      articleMarkdown?: string
    }
    const metaTitle = (parsed.metaTitle || '').trim()
    const metaDescription = (parsed.metaDescription || '').trim()
    const articleMarkdown = (parsed.articleMarkdown || '').trim()
    if (!articleMarkdown) {
      throw createError({ statusCode: 502, message: 'Claude returned an empty article. Try again.' })
    }
    return { metaTitle, metaDescription, articleMarkdown }
  } catch (e) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e
    throw createError({
      statusCode: 502,
      message: 'Could not parse the article response. Try generating again.',
    })
  }
})
