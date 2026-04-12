import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getClaudeConfig } from '~/server/utils/claude'
import { runEmailMarketingAi, type EmailAiTask } from '~/server/utils/emailMarketingAi'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    task?: string
    campaignName?: string
    subject?: string
    bodyHtml?: string
    brief?: string
    instruction?: string
    tone?: string
  }

  const task = body?.task as EmailAiTask
  const allowed: EmailAiTask[] = ['ideas', 'subjects', 'compose', 'refine']
  if (!task || !allowed.includes(task)) {
    throw createError({ statusCode: 400, message: 'Invalid task' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const config = await getClaudeConfig(pb)
  if (!config?.api_key) {
    throw createError({
      statusCode: 503,
      message:
        'Claude is not configured. Add an API key under Admin → Integrations (Claude), or set CLAUDE_API_KEY / ANTHROPIC_API_KEY for development.',
    })
  }

  try {
    const result = await runEmailMarketingAi(config, {
      task,
      campaignName: body?.campaignName ?? '',
      subject: body?.subject ?? '',
      bodyHtml: body?.bodyHtml ?? '',
      brief: body?.brief,
      instruction: body?.instruction,
      tone: body?.tone,
    })

    if (task === 'compose' || task === 'refine') {
      if (!result.bodyHtml?.trim()) {
        throw createError({ statusCode: 502, message: 'AI did not return a valid email body. Try again or shorten your request.' })
      }
    }

    return result
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e
    const msg = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 502, message: msg.slice(0, 400) })
  }
})
