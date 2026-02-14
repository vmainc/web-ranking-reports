const store = new Map<string, { userId: string; siteId: string; expires: number }>()
const TTL_MS = 5 * 60 * 1000

export function createPdfToken(userId: string, siteId: string): string {
  const token = `pdf_${crypto.randomUUID().replace(/-/g, '')}`
  store.set(token, {
    userId,
    siteId,
    expires: Date.now() + TTL_MS,
  })
  return token
}

export function resolvePdfToken(token: string): { userId: string; siteId: string } | null {
  if (!token.startsWith('pdf_')) return null
  const raw = token.slice(4)
  const entry = store.get(raw)
  if (!entry || Date.now() > entry.expires) {
    if (entry) store.delete(raw)
    return null
  }
  return { userId: entry.userId, siteId: entry.siteId }
}
