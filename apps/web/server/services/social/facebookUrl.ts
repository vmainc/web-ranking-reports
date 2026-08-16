const RESERVED_PATHS = new Set([
  'watch',
  'events',
  'groups',
  'marketplace',
  'gaming',
  'reel',
  'reels',
  'stories',
  'login',
  'sharer',
  'share',
  'dialog',
  'privacy',
  'policies',
  'help',
  'settings',
  'bookmarks',
  'home',
  'feed',
  'notifications',
  'messages',
  'friends',
  'photo',
  'photos',
  'video',
  'videos',
  'story.php',
  'permalink.php',
])

export type NormalizedFacebookPageUrl = {
  canonicalUrl: string
  username?: string
  numericId?: string
  displayHint: string
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '')
}

/**
 * Normalize common Facebook Page URL forms into a canonical https://www.facebook.com/... URL.
 * Does not call Facebook. Invalid / non-page URLs return null.
 */
export function normalizeFacebookPageUrl(raw: unknown): NormalizedFacebookPageUrl | null {
  if (typeof raw !== 'string') return null
  let input = raw.trim()
  if (!input) return null
  if (!/^https?:\/\//i.test(input)) input = `https://${input}`

  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./i, '').toLowerCase()
  if (host !== 'facebook.com' && host !== 'fb.com' && host !== 'm.facebook.com' && host !== 'web.facebook.com') {
    return null
  }

  const path = stripTrailingSlash(url.pathname).replace(/^\/+/, '')
  const parts = path ? path.split('/').filter(Boolean) : []

  const profileId = url.searchParams.get('id')
  if ((parts[0] === 'profile.php' || parts[0] === 'people') && profileId && /^\d+$/.test(profileId)) {
    return {
      canonicalUrl: `https://www.facebook.com/profile.php?id=${profileId}`,
      numericId: profileId,
      displayHint: profileId,
    }
  }

  if (parts[0] === 'pages' && parts.length >= 3 && /^\d+$/.test(parts[parts.length - 1])) {
    const id = parts[parts.length - 1]
    const slug = decodeURIComponent(parts[1] || '').trim()
    return {
      canonicalUrl: `https://www.facebook.com/pages/${encodeURIComponent(slug)}/${id}`,
      numericId: id,
      username: slug || undefined,
      displayHint: slug || id,
    }
  }

  if (parts[0] === 'pages' && parts.length === 2 && parts[1] && !RESERVED_PATHS.has(parts[1].toLowerCase())) {
    const slug = decodeURIComponent(parts[1]).trim()
    if (!isValidPageSlug(slug)) return null
    return {
      canonicalUrl: `https://www.facebook.com/${slug}`,
      username: slug,
      displayHint: slug,
    }
  }

  if (parts.length === 1 && parts[0] && !RESERVED_PATHS.has(parts[0].toLowerCase()) && parts[0] !== 'pages') {
    const slug = decodeURIComponent(parts[0]).trim()
    if (!isValidPageSlug(slug)) return null
    return {
      canonicalUrl: `https://www.facebook.com/${slug}`,
      username: slug,
      displayHint: slug,
    }
  }

  return null
}

function isValidPageSlug(slug: string): boolean {
  if (!slug || slug.length > 100) return false
  if (slug.includes('.') && !/^[A-Za-z0-9._-]+$/.test(slug)) return false
  return /^[A-Za-z0-9._-]+$/.test(slug)
}

export function facebookUrlAssetId(normalized: NormalizedFacebookPageUrl): string {
  if (normalized.numericId) return `fb_id:${normalized.numericId}`
  if (normalized.username) return `fb_url:${normalized.username.toLowerCase()}`
  return `fb_url:${normalized.canonicalUrl}`
}

export function displayNameFromFacebookHint(hint: string): string {
  const cleaned = hint.replace(/[-_]+/g, ' ').trim()
  if (!cleaned) return hint
  return cleaned
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}
