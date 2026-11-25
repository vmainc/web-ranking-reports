import { ClientResponseError } from 'pocketbase'

export function isPocketBaseMissingCollection(e: unknown): boolean {
  const err = e as { status?: number; message?: string; response?: { message?: string } }
  const msg = [err?.response?.message, err?.message, String(e ?? '')].filter(Boolean).join(' ')
  return (
    err?.status === 404 ||
    /requested resource wasn't found|collection.*not found|unknown collection|missing collection|failed to resolve collection/i.test(
      msg,
    )
  )
}

/** Human-readable PocketBase failure for API responses (validation, missing fields, etc.). */
export function formatPocketBaseError(e: unknown): string {
  if (isPocketBaseMissingCollection(e)) {
    return 'Proposal PocketBase collections are missing or outdated. On the VPS run: ./infra/run-proposal-collections.sh'
  }
  if (e instanceof ClientResponseError) {
    const data = e.response as { message?: string; data?: Record<string, { message?: string; code?: string }> }
    if (data?.data && typeof data.data === 'object') {
      const parts = Object.entries(data.data)
        .map(([field, info]) => {
          const msg = info && typeof info === 'object' && 'message' in info ? String(info.message) : ''
          return msg ? `${field}: ${msg}` : field
        })
        .filter(Boolean)
      if (parts.length) return parts.join('; ')
    }
    if (data?.message && data.message !== 'Something went wrong while processing your request.') {
      return data.message
    }
    if (e.message && e.message !== 'ClientResponseError') return e.message
    return 'PocketBase rejected the save (often a missing collection or outdated proposal_items schema — run ./infra/run-proposal-collections.sh on the VPS).'
  }
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string') {
    return (e as { message: string }).message
  }
  return String(e ?? 'Unknown error')
}