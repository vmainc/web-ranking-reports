/** Normalize contact website for storage (domain or URL → https URL). */
export function normalizeCrmWebsite(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s.replace(/^\/\//, '')}`
}

export function crmWebsiteHref(raw: string | null | undefined): string {
  return normalizeCrmWebsite(raw) ?? ''
}

/** Display without scheme for compact UI. */
export function crmWebsiteLabel(raw: string | null | undefined): string {
  const s = (raw ?? '').trim()
  if (!s) return ''
  return s.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}