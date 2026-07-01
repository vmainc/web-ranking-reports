/** Display helpers for rank-tracking rows on site pages and in reports. */

export interface RankResultJson {
  position?: number
  url?: string
  title?: string
  changeDirection?: 'up' | 'down' | 'same' | 'new' | 'lost' | 'none'
  changeSpots?: number | null
  error?: string
}

export function rankChangeLabel(result: RankResultJson | null | undefined): string {
  const dir = result?.changeDirection
  const spots = result?.changeSpots
  if (dir === 'up' && typeof spots === 'number') return `▲ +${spots}`
  if (dir === 'down' && typeof spots === 'number') return `▼ -${spots}`
  if (dir === 'new') return 'New ranking'
  if (dir === 'lost') return 'Lost ranking'
  if (dir === 'same' && spots === 0) return 'No change'
  return '—'
}

export function rankChangeClass(result: RankResultJson | null | undefined): string {
  const dir = result?.changeDirection
  if (dir === 'up' || dir === 'new') return 'font-medium text-emerald-700'
  if (dir === 'down' || dir === 'lost') return 'font-medium text-red-700'
  return 'text-surface-500'
}

export function rankUrlPath(url: string): string {
  try {
    const u = new URL(url)
    return `${u.pathname}${u.search || ''}` || '/'
  } catch {
    return url
  }
}
