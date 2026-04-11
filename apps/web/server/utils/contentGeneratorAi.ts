import type { ClaudeConfig } from '~/server/utils/claude'

export function extractJsonObject(text: string): string {
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

export async function claudeTextCompletion(
  config: ClaudeConfig,
  params: { max_tokens: number; temperature: number; system?: string; user: string },
): Promise<string> {
  const endpoint = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages'
  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: params.max_tokens,
    temperature: params.temperature,
    messages: [{ role: 'user', content: params.user }],
  }
  if (params.system) body.system = params.system

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
    throw new Error(`Claude API error: ${res.status} ${text.slice(0, 300)}`)
  }

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> }
  return (data.content ?? [])
    .filter((c) => c?.type === 'text' && c?.text)
    .map((c) => c.text as string)
    .join('\n')
    .trim()
}
