/**
 * Safe keyword normalization for rank tracking.
 * Only strips accidental whitespace — does not alter legitimate query characters.
 */

/** Collapse whitespace and trim; return null if empty after normalize. */
export function normalizeTrackedKeyword(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  // Replace any unicode whitespace (including newlines/tabs) with a single space, then trim.
  const cleaned = raw.replace(/\s+/gu, ' ').trim()
  if (!cleaned) return null
  return cleaned
}

/** Case-insensitive dedupe key; preserves original casing via Map values elsewhere. */
export function keywordDedupeKey(keyword: string): string {
  return keyword.trim().toLowerCase()
}

/**
 * Normalize a list of incoming keywords for create:
 * trim/collapse whitespace, drop empties, case-insensitive dedupe (first casing wins).
 */
export function normalizeKeywordList(raw: unknown[], maxLen = 700): {
  keywords: string[]
  rejectedEmpty: number
  rejectedTooLong: string[]
} {
  const rejectedTooLong: string[] = []
  let rejectedEmpty = 0
  const byNorm = new Map<string, string>()
  for (const item of raw) {
    const k = normalizeTrackedKeyword(item)
    if (!k) {
      rejectedEmpty += 1
      continue
    }
    if (k.length > maxLen) {
      rejectedTooLong.push(k.slice(0, 40))
      continue
    }
    const key = keywordDedupeKey(k)
    if (!byNorm.has(key)) byNorm.set(key, k)
  }
  return { keywords: Array.from(byNorm.values()), rejectedEmpty, rejectedTooLong }
}
