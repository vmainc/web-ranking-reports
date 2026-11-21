/** Canonical preset tags (use exact strings for filters and campaigns). */
export const CRM_TAG_PREVIOUS_CLIENT = 'Previous client'

export const CRM_PRESET_CONTACT_TAGS = [CRM_TAG_PREVIOUS_CLIENT] as const

export function hasContactTag(tags: unknown, tag: string): boolean {
  if (!Array.isArray(tags) || !tag.trim()) return false
  const want = tag.trim().toLowerCase()
  return tags.some((x) => String(x).trim().toLowerCase() === want)
}

export function toggleContactTag(
  tags: string[] | null | undefined,
  tag: string,
  enabled: boolean,
): string[] | null {
  const base = Array.isArray(tags) ? [...tags] : []
  const without = base.filter((x) => String(x).trim().toLowerCase() !== tag.trim().toLowerCase())
  if (!enabled) return without.length ? without : null
  if (hasContactTag(without, tag)) return without.length ? without : null
  return [...without, tag]
}

export function mergeContactTags(existing: string[] | null | undefined, add: string[]): string[] | null {
  const set = new Set<string>()
  for (const x of existing ?? []) {
    const s = String(x).trim()
    if (s) set.add(s)
  }
  for (const x of add) {
    const s = String(x).trim()
    if (s) set.add(s)
  }
  return set.size ? [...set] : null
}

/** Normalize one tag label (trim, collapse spaces). */
export function normalizeContactTag(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80)
}

/** Parse tags_json from API (array or legacy string). */
export function parseContactTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => normalizeContactTag(String(x))).filter(Boolean)
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) return parseContactTags(parsed)
    } catch {
      /* fall through */
    }
    return raw
      .split(/[,;|]/)
      .map((x) => normalizeContactTag(x))
      .filter(Boolean)
  }
  return []
}

export function addContactTag(tags: string[] | null | undefined, tag: string): string[] {
  const next = [...parseContactTags(tags)]
  const t = normalizeContactTag(tag)
  if (!t) return next
  if (!hasContactTag(next, t)) next.push(t)
  return next
}

export function removeContactTag(tags: string[] | null | undefined, tag: string): string[] {
  const want = tag.trim().toLowerCase()
  return parseContactTags(tags).filter((x) => x.trim().toLowerCase() !== want)
}

export function tagsToStorage(tags: string[] | null | undefined): string[] | null {
  const list = parseContactTags(tags)
  return list.length ? list : null
}