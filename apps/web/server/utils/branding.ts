import type PocketBase from 'pocketbase'
import { getClaudeConfig } from '~/server/utils/claude'

export const BRANDING_KEY = 'agency_branding'

export interface BrandingColors {
  primary: string
  accent: string
  text: string
  surface: string
}

export const DEFAULT_BRANDING: BrandingColors = {
  primary: '#2563EB',
  accent: '#1D4ED8',
  text: '#0F172A',
  surface: '#FFFFFF',
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

export function normalizeHex(value: string | undefined): string | null {
  if (!value) return null
  const v = value.trim()
  if (!/^#?[0-9a-fA-F]{6}$/.test(v)) return null
  return `#${v.replace('#', '').toUpperCase()}`
}

export async function saveBrandingColors(pb: PocketBase, colors: BrandingColors) {
  let row: { id: string } | null = null
  try {
    row = await pb.collection('app_settings').getFirstListItem<{ id: string }>(`key="${BRANDING_KEY}"`)
  } catch {
    row = null
  }
  if (row) {
    await pb.collection('app_settings').update(row.id, { value: colors })
  } else {
    await pb.collection('app_settings').create({ key: BRANDING_KEY, value: colors })
  }
}

export async function detectBrandingFromLogo(
  pb: PocketBase,
  logoBytes: Uint8Array,
  contentType: string
): Promise<BrandingColors | null> {
  const claude = await getClaudeConfig(pb)
  if (!claude) return null

  const endpoint = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages'
  const prompt = [
    'Analyze this agency logo and extract a clean report color palette.',
    'Return ONLY JSON with this exact shape:',
    '{ "primary": "#112233", "accent": "#445566", "text": "#111111", "surface": "#FFFFFF" }',
    'Rules:',
    '- Use 6-char hex colors only.',
    '- text must be dark and readable on white.',
    '- surface should usually be white or near-white.',
    '- Keep palette professional and high-contrast for dashboards/reports.',
    '- No markdown or extra text.',
  ].join('\n')

  const body = {
    model: claude.model,
    max_tokens: 600,
    temperature: 0.1,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: contentType || 'image/png',
              data: Buffer.from(logoBytes).toString('base64'),
            },
          },
        ],
      },
    ],
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claude.api_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> }
  const text = (data.content ?? [])
    .filter((c) => c?.type === 'text' && c?.text)
    .map((c) => c.text as string)
    .join('\n')
    .trim()
  if (!text) return null

  try {
    const parsed = JSON.parse(extractJsonObject(text)) as Partial<BrandingColors>
    const primary = normalizeHex(parsed.primary)
    const accent = normalizeHex(parsed.accent)
    const textColor = normalizeHex(parsed.text)
    const surface = normalizeHex(parsed.surface)
    if (!primary || !accent || !textColor || !surface) return null
    return { primary, accent, text: textColor, surface }
  } catch {
    return null
  }
}

