import type { AiVisibilityPlatformMetrics, AiVisibilityProfile } from '~/types/aiVisibility'

export function formatAiVisibilityNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString()
}

export function formatAiVisibilityWhen(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function aiVisibilityTotalCost(costs: AiVisibilityProfile['costs'] | undefined): number {
  if (!costs) return 0
  return Object.values(costs).reduce((s, v) => s + (typeof v === 'number' && Number.isFinite(v) ? v : 0), 0)
}

export function aiVisibilityErrorMessage(errors: AiVisibilityProfile['errors'] | undefined): string {
  if (!errors) return ''
  const parts = Object.entries(errors)
    .filter(([, v]) => typeof v === 'string' && v.trim())
    .map(([k, v]) => `${k}: ${v}`)
  return parts.join(' · ')
}

export function platformLabel(key: 'google' | 'chat_gpt' | 'total'): string {
  if (key === 'google') return 'Google AI Overview'
  if (key === 'chat_gpt') return 'ChatGPT'
  return 'Combined'
}

export function metricsOrZero(m: AiVisibilityPlatformMetrics | null | undefined): AiVisibilityPlatformMetrics {
  return {
    mentions: m?.mentions ?? 0,
    aiSearchVolume: m?.aiSearchVolume ?? 0,
  }
}
