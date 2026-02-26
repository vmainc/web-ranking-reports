/**
 * Claude API helper for technical SEO site audits.
 *
 * Stores config in PocketBase `app_settings` with key "claude_api":
 * { api_key: string; model?: string }
 */

import type PocketBase from 'pocketbase'

export interface ClaudeConfig {
  api_key: string
  model: string
}

export interface SiteAuditIssue {
  id: string
  severity: 'error' | 'warning' | 'info'
  area: string
  title: string
  description: string
  recommendation: string
}

export interface SiteAuditResult {
  url: string
  fetchedAt: string
  summary: string
  issues: SiteAuditIssue[]
}

const SITE_AUDIT_RESULTS_KEY = 'site_audit_results'

/** Load the last saved site audit for a site from app_settings (does not depend on sites schema). */
export async function getSiteAuditResult(
  pb: PocketBase,
  siteId: string
): Promise<SiteAuditResult | null> {
  try {
    const row = await pb
      .collection('app_settings')
      .getFirstListItem<{ value?: Record<string, unknown> }>(`key="${SITE_AUDIT_RESULTS_KEY}"`)
    const data = row?.value?.[siteId]
    if (data && typeof data === 'object' && typeof (data as SiteAuditResult).summary === 'string' && Array.isArray((data as SiteAuditResult).issues)) {
      return data as SiteAuditResult
    }
    return null
  } catch {
    return null
  }
}

/** Save a site audit result in app_settings (does not depend on sites schema). */
export async function saveSiteAuditResult(
  pb: PocketBase,
  siteId: string,
  result: SiteAuditResult
): Promise<void> {
  let row: { id: string; value?: Record<string, unknown> } | null = null
  try {
    row = await pb
      .collection('app_settings')
      .getFirstListItem<{ id: string; value?: Record<string, unknown> }>(`key="${SITE_AUDIT_RESULTS_KEY}"`)
  } catch {
    // no record yet
  }
  const current: Record<string, unknown> = row?.value && typeof row.value === 'object' ? { ...row.value } : {}
  current[siteId] = result
  if (row) {
    await pb.collection('app_settings').update(row.id, { value: current })
  } else {
    await pb.collection('app_settings').create({ key: SITE_AUDIT_RESULTS_KEY, value: current })
  }
}

/** Load Claude API config from PocketBase app_settings or env. */
export async function getClaudeConfig(pb: PocketBase): Promise<ClaudeConfig | null> {
  // Env override for local/dev if desired
  const envKey = process.env.CLAUDE_API_KEY
  const envModel = process.env.CLAUDE_MODEL
  if (envKey) {
    return { api_key: envKey, model: envModel || 'claude-haiku-4-5' }
  }

  try {
    const row = await pb
      .collection('app_settings')
      .getFirstListItem<{ value: { api_key?: string; model?: string } }>('key="claude_api"')
    const v = row?.value ?? {}
    if (!v.api_key) return null
    return { api_key: v.api_key, model: v.model || 'claude-haiku-4-5' }
  } catch {
    return null
  }
}

/** Call Claude Messages API with a structured audit prompt and return parsed result. */
export async function runClaudeSiteAudit(
  config: ClaudeConfig,
  params: { url: string; htmlSnippet: string }
): Promise<SiteAuditResult> {
  const endpoint = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages'

  const systemPrompt =
    'You are a senior technical SEO specialist. Analyse websites for crawlability, indexability, performance, on-page SEO, structured data, security, and UX signals that matter for search. ' +
    'Focus on concrete, actionable technical issues. Ignore content strategy and copywriting unless it is a clear technical SEO problem (e.g. missing titles).'

  const userPrompt = [
    `URL: ${params.url}`,
    '',
    'HTML (truncated):',
    params.htmlSnippet,
    '',
    'Return a JSON object with this exact shape:',
    '{',
    '  "summary": "high-level overview string",',
    '  "issues": [',
    '    {',
    '      "id": "short-machine-readable-id",',
    '      "severity": "error | warning | info",',
    '      "area": "crawlability | indexing | performance | on_page | structured_data | links | ux | security | other",',
    '      "title": "human readable title",',
    '      "description": "what is wrong and why it matters",',
    '      "recommendation": "clear, concise fix steps"',
    '    }',
    '  ]',
    '}',
    '',
    'Output only this JSON object and nothing else: no markdown, no code fences, no explanation before or after.',
  ].join('\n')

  const body = {
    model: config.model,
    max_tokens: 4096,
    temperature: 0.2,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.api_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw createError({
      statusCode: 502,
      message: `Claude API error: ${res.status} ${text.slice(0, 200)}`,
    })
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>
  }
  // Join all text blocks in case the API returns multiple (e.g. thinking + answer)
  const content = (data.content ?? [])
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => (c as { text: string }).text)
    .join('\n')
    .trim()
  let parsed: { summary?: string; issues?: SiteAuditIssue[] }
  try {
    let jsonText = content.trim()
    // Strip Markdown code fences if Claude wrapped JSON in ```json ... ``` or ``` ... ```.
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```[a-zA-Z]*\s*/u, '').replace(/```$/u, '').trim()
    }
    // Fallback: grab text between first { and last }.
    const firstBrace = jsonText.indexOf('{')
    const lastBrace = jsonText.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonText = jsonText.slice(firstBrace, lastBrace + 1)
    }
    parsed = JSON.parse(jsonText) as { summary?: string; issues?: SiteAuditIssue[] }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Claude site audit] Failed to parse JSON from Claude response:', content.slice(0, 800))
    }
    // Fallback: extract "summary" from raw text so we never show JSON code to the user.
    const now = new Date().toISOString()
    let fallbackSummary = 'The audit completed but the response format was invalid. Try running the audit again.'
    const summaryMatch = content.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/)
    if (summaryMatch?.[1]) {
      fallbackSummary = summaryMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim()
    }
    return {
      url: params.url,
      fetchedAt: now,
      summary: fallbackSummary,
      issues: [],
    }
  }

  const now = new Date().toISOString()
  return {
    url: params.url,
    fetchedAt: now,
    summary: parsed.summary ?? 'No summary provided.',
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
  }
}

