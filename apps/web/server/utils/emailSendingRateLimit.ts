import { createError } from 'h3'

/** Simple in-memory rate limiter for agency email-sending endpoints (per user). */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function assertRateLimit(opts: {
  key: string
  limit: number
  windowMs: number
  message?: string
}): void {
  const now = Date.now()
  const cur = buckets.get(opts.key)
  if (!cur || now >= cur.resetAt) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs })
    return
  }
  if (cur.count >= opts.limit) {
    throw createError({
      statusCode: 429,
      message: opts.message || 'Too many requests. Try again later.',
    })
  }
  cur.count += 1
}

/** Test helper to clear buckets between tests. */
export function _resetEmailSendingRateLimits(): void {
  buckets.clear()
}
