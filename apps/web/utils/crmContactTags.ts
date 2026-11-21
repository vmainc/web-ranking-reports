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