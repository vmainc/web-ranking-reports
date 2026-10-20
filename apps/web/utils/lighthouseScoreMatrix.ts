/** PageSpeed Insights / Lighthouse category scores (0–100). */
export type LighthouseCategoryScores = {
  performance: number | null
  accessibility: number | null
  bestPractices: number | null
  seo: number | null
}

export const LIGHTHOUSE_SCORE_CATEGORIES: Array<{
  key: keyof LighthouseCategoryScores
  label: string
  short: string
}> = [
  { key: 'performance', label: 'Performance', short: 'Perf' },
  { key: 'seo', label: 'SEO', short: 'SEO' },
  { key: 'accessibility', label: 'Accessibility', short: 'A11y' },
  { key: 'bestPractices', label: 'Best practices', short: 'BP' },
]

export function formatLighthouseScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return String(value)
}

export function lighthouseScoreTone(value: number | null | undefined): 'good' | 'mid' | 'low' | 'none' {
  if (value == null || Number.isNaN(value)) return 'none'
  if (value >= 90) return 'good'
  if (value >= 50) return 'mid'
  return 'low'
}

function formatSide(label: string, scores: LighthouseCategoryScores | undefined): string {
  if (!scores) return ''
  const parts = LIGHTHOUSE_SCORE_CATEGORIES.map(
    (c) => `${c.short} ${formatLighthouseScore(scores[c.key])}`,
  )
  return `${label}: ${parts.join(', ')}`
}

/** Email / CRM one-liner with all eight scores when available. */
export function lighthouseScoresSummary(
  mobile: LighthouseCategoryScores | undefined,
  desktop: LighthouseCategoryScores | undefined,
): string {
  const bits = [formatSide('Mobile', mobile), formatSide('Desktop', desktop)].filter(Boolean)
  return bits.join(' · ') || 'See your full report for PageSpeed scores.'
}
