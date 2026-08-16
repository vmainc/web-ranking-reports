import { createError } from 'h3'

export const SocialErrorCode = {
  META_AUTH_EXPIRED: 'META_AUTH_EXPIRED',
  META_PERMISSION_MISSING: 'META_PERMISSION_MISSING',
  META_PAGE_ACCESS_REMOVED: 'META_PAGE_ACCESS_REMOVED',
  META_RATE_LIMITED: 'META_RATE_LIMITED',
  META_API_ERROR: 'META_API_ERROR',
  PUBLIC_PROVIDER_UNAVAILABLE: 'PUBLIC_PROVIDER_UNAVAILABLE',
  PUBLIC_PAGE_NOT_FOUND: 'PUBLIC_PAGE_NOT_FOUND',
  SOCIAL_SYNC_ERROR: 'SOCIAL_SYNC_ERROR',
  SOCIAL_CONNECTION_NOT_FOUND: 'SOCIAL_CONNECTION_NOT_FOUND',
  SOCIAL_DUPLICATE_CONNECTION: 'SOCIAL_DUPLICATE_CONNECTION',
} as const

export type SocialErrorCodeType = (typeof SocialErrorCode)[keyof typeof SocialErrorCode]

export class SocialServiceError extends Error {
  readonly code: SocialErrorCodeType
  readonly httpStatus: number
  readonly publicMessage: string

  constructor(opts: {
    code: SocialErrorCodeType
    message: string
    publicMessage?: string
    httpStatus?: number
  }) {
    super(opts.message)
    this.name = 'SocialServiceError'
    this.code = opts.code
    this.httpStatus = opts.httpStatus ?? 400
    this.publicMessage = opts.publicMessage ?? defaultPublicMessage(opts.code)
  }
}

function defaultPublicMessage(code: SocialErrorCodeType): string {
  switch (code) {
    case SocialErrorCode.META_AUTH_EXPIRED:
      return 'Meta needs to be reconnected to continue collecting Facebook Insights.'
    case SocialErrorCode.META_PERMISSION_MISSING:
      return 'Meta is missing a required Page permission. Reconnect Meta and grant Page access.'
    case SocialErrorCode.META_PAGE_ACCESS_REMOVED:
      return 'This Facebook Page is no longer accessible with the connected Meta account.'
    case SocialErrorCode.META_RATE_LIMITED:
      return 'Facebook is rate-limiting requests. We will retry on the next scheduled sync.'
    case SocialErrorCode.META_API_ERROR:
      return 'Facebook Insights could not be loaded. Try again later.'
    case SocialErrorCode.PUBLIC_PROVIDER_UNAVAILABLE:
      return 'Public Facebook metrics are not currently available for this Page. Connect Meta for Page Insights.'
    case SocialErrorCode.PUBLIC_PAGE_NOT_FOUND:
      return 'That does not look like a Facebook Page URL we can track.'
    case SocialErrorCode.SOCIAL_DUPLICATE_CONNECTION:
      return 'This Facebook Page is already connected to the site.'
    case SocialErrorCode.SOCIAL_CONNECTION_NOT_FOUND:
      return 'Social connection not found.'
    default:
      return 'Social sync failed. Historical report data is unchanged.'
  }
}

export function isSocialServiceError(e: unknown): e is SocialServiceError {
  return e instanceof SocialServiceError
}

export function publicSocialError(e: unknown): { code: string; message: string; status: number } {
  if (isSocialServiceError(e)) {
    return { code: e.code, message: e.publicMessage, status: e.httpStatus }
  }
  return {
    code: SocialErrorCode.SOCIAL_SYNC_ERROR,
    message: defaultPublicMessage(SocialErrorCode.SOCIAL_SYNC_ERROR),
    status: 500,
  }
}

export function throwHttpFromSocial(e: unknown): never {
  const p = publicSocialError(e)
  throw createError({ statusCode: p.status, message: p.message, data: { code: p.code } })
}
