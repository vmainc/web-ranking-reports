/** Extract a user-facing message from API errors (e.g. $fetch / createError). */
export function getApiErrorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data
    if (data && typeof data === 'object' && 'message' in data) {
      const msg = (data as { message?: string }).message
      if (typeof msg === 'string' && msg) return msg
    }
  }
  if (e instanceof Error && e.message) return e.message
  return typeof e === 'string' ? e : 'Failed to load'
}
