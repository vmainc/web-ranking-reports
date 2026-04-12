import type { ClaudeConfig } from '~/server/utils/claude'
import { claudeTextCompletion, extractJsonObject } from '~/server/utils/contentGeneratorAi'

export type EmailAiTask = 'ideas' | 'subjects' | 'compose' | 'refine'

const MERGE_RULES =
  'Always preserve the exact merge tokens {{first_name}} and {{email}} anywhere they appear. Do not rename or remove them. ' +
  'Use simple HTML only: <p>, <br>, <a>, <strong>, <em>, <ul>, <li> unless the user already used other tags.'

function stripHtml(html: string, maxLen: number): string {
  const t = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t
}

function parseJsonArrayField(raw: string, field: string): string[] {
  try {
    const obj = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>
    const arr = obj[field]
    if (!Array.isArray(arr)) return []
    return arr.map((x) => String(x).trim()).filter(Boolean).slice(0, 12)
  } catch {
    return []
  }
}

function parseJsonBodyField(raw: string): string {
  try {
    const obj = JSON.parse(extractJsonObject(raw)) as { bodyHtml?: string }
    const h = typeof obj.bodyHtml === 'string' ? obj.bodyHtml.trim() : ''
    return h
  } catch {
    return ''
  }
}

export async function runEmailMarketingAi(
  config: ClaudeConfig,
  params: {
    task: EmailAiTask
    campaignName: string
    subject: string
    bodyHtml: string
    brief?: string
    instruction?: string
    tone?: string
  },
): Promise<{ ideas?: string[]; subjects?: string[]; bodyHtml?: string }> {
  const name = params.campaignName.trim() || '(untitled campaign)'
  const subject = params.subject.trim()
  const bodyPlain = stripHtml(params.bodyHtml, 8000)
  const tone = (params.tone || 'professional').trim()
  const system = `You are an expert email marketer for digital agencies and B2B services. ${MERGE_RULES} Be concise. Output valid JSON only, no markdown fences.`

  let user: string
  let maxTokens: number
  let temperature: number

  switch (params.task) {
    case 'ideas': {
      maxTokens = 1200
      temperature = 0.85
      const extra = params.brief?.trim() ? `Additional context from the user: ${params.brief.trim().slice(0, 500)}` : ''
      user = [
        `Campaign working title: "${name}".`,
        extra,
        '',
        'Suggest 8 distinct campaign angle ideas (themes, hooks, or goals) the user could run.',
        'Each idea is one short line (max 120 characters).',
        'Return JSON exactly: {"ideas":["...","..."]}',
      ]
        .filter(Boolean)
        .join('\n')
      break
    }
    case 'subjects': {
      maxTokens = 800
      temperature = 0.75
      user = [
        `Campaign name: "${name}".`,
        subject ? `Current subject line: "${subject}".` : 'No subject yet.',
        `Email body (plain text summary): ${bodyPlain || '(empty)'}`,
        '',
        `Tone: ${tone}.`,
        'Return 6 compelling subject lines, each under 90 characters, no spam tricks, no ALL CAPS.',
        'Return JSON exactly: {"subjects":["...","..."]}',
      ].join('\n')
      break
    }
    case 'compose': {
      maxTokens = 4096
      temperature = 0.7
      const brief = params.brief?.trim() || 'A friendly check-in with a clear call to reply.'
      user = [
        `Campaign name: "${name}".`,
        subject ? `Preferred subject direction: "${subject}".` : '',
        `Tone: ${tone}.`,
        '',
        'Write a complete HTML email body from this brief:',
        brief.slice(0, 4000),
        '',
        'Include a personalized greeting using {{first_name}} and a professional sign-off.',
        'Return JSON exactly: {"bodyHtml":"<p>...</p>"}',
      ]
        .filter(Boolean)
        .join('\n')
      break
    }
    case 'refine': {
      maxTokens = 4096
      temperature = 0.45
      const instr = params.instruction?.trim() || 'Improve clarity and flow while keeping the same intent.'
      user = [
        `Campaign name: "${name}".`,
        subject ? `Subject: "${subject}".` : '',
        'Current HTML body:',
        params.bodyHtml.trim().slice(0, 24000) || '<p>(empty)</p>',
        '',
        'Instruction:',
        instr.slice(0, 1500),
        '',
        `Target tone: ${tone}.`,
        'Return JSON exactly: {"bodyHtml":"..."} with the full revised HTML.',
      ].join('\n')
      break
    }
    default:
      throw new Error('Invalid task')
  }

  const raw = await claudeTextCompletion(config, {
    max_tokens: maxTokens,
    temperature,
    system,
    user,
  })

  if (params.task === 'ideas') {
    const ideas = parseJsonArrayField(raw, 'ideas')
    return { ideas: ideas.length ? ideas : [raw.slice(0, 500)] }
  }
  if (params.task === 'subjects') {
    const subjects = parseJsonArrayField(raw, 'subjects')
    return { subjects: subjects.length ? subjects : [raw.slice(0, 120)] }
  }
  if (params.task === 'compose' || params.task === 'refine') {
    let bodyHtml = parseJsonBodyField(raw)
    if (!bodyHtml) {
      bodyHtml = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/u, '').trim()
    }
    return { bodyHtml }
  }
  return {}
}
