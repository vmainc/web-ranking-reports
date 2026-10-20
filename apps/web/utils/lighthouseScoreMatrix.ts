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

/** Google PageSpeed Insights score colors (red / amber / green). */
export type LighthouseScoreTone = ReturnType<typeof lighthouseScoreTone>

export function lighthouseScorePalette(tone: LighthouseScoreTone): {
  ring: string
  text: string
  soft: string
  border: string
} {
  switch (tone) {
    case 'good':
      return { ring: '#0cce6b', text: '#137333', soft: '#e6f4ea', border: '#34a853' }
    case 'mid':
      return { ring: '#ffa400', text: '#b06000', soft: '#fef7e0', border: '#f9ab00' }
    case 'low':
      return { ring: '#ff4e42', text: '#c5221f', soft: '#fce8e6', border: '#ea4335' }
    default:
      return { ring: '#dadce0', text: '#5f6368', soft: '#f1f3f4', border: '#dadce0' }
  }
}

/** SVG ring dash offset for a 0–100 Lighthouse score (radius 34). */
export function lighthouseGaugeStrokeOffset(score: number | null | undefined, radius = 34): number {
  const c = 2 * Math.PI * radius
  if (score == null || Number.isNaN(score)) return c
  const clamped = Math.max(0, Math.min(100, score))
  return c * (1 - clamped / 100)
}

export function lighthouseGaugeCircumference(radius = 34): number {
  return 2 * Math.PI * radius
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
