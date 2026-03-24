import { createHmac, randomBytes } from 'node:crypto'

const SEP = '.'
const TTL_MS = 10 * 60 * 1000 // 10 minutes

/** Where to send the browser after a successful Google OAuth callback. */
export type AfterConnectDestination = 'setup' | 'dashboard' | 'business-profile'

export interface StatePayload {
  /** Empty when `mode` is `account` (user-level default Google, not tied to a site). */
  siteId: string
  userId: string
  nonce: string
  ts: number
  /** Optional post-OAuth redirect (defaults to site dashboard when omitted). */
  afterConnect?: AfterConnectDestination
  /** `account` = save tokens on the user record for default integrations + calendar. */
  mode?: 'site' | 'account'
}

export function createState(
  secret: string,
  siteId: string,
  userId: string,
  afterConnect?: AfterConnectDestination,
  mode?: 'site' | 'account'
): string {
  const payload: StatePayload = {
    siteId: mode === 'account' ? '' : siteId,
    userId,
    nonce: randomBytes(16).toString('hex'),
    ts: Date.now(),
    ...(afterConnect ? { afterConnect } : {}),
    ...(mode === 'account' ? { mode: 'account' as const } : {}),
  }
  const raw = JSON.stringify(payload)
  const b64 = Buffer.from(raw, 'utf8').toString('base64url')
  const sig = createHmac('sha256', secret).update(b64).digest('base64url')
  return `${b64}${SEP}${sig}`
}

export function verifyState(secret: string, state: string): StatePayload | null {
  if (!state || !secret) return null
  const i = state.lastIndexOf(SEP)
  if (i === -1) return null
  const b64 = state.slice(0, i)
  const sig = state.slice(i + 1)
  const expectedSig = createHmac('sha256', secret).update(b64).digest('base64url')
  if (sig !== expectedSig) return null
  let payload: StatePayload
  try {
    payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as StatePayload
  } catch {
    return null
  }
  if (Date.now() - payload.ts > TTL_MS) return null
  if (!payload.userId) return null
  const mode = payload.mode ?? 'site'
  if (mode === 'account') {
    if ((payload.siteId ?? '') !== '') return null
  } else if (!payload.siteId) {
    return null
  }
  if (
    payload.afterConnect != null &&
    payload.afterConnect !== 'setup' &&
    payload.afterConnect !== 'dashboard' &&
    payload.afterConnect !== 'business-profile'
  ) {
    return null
  }
  return payload
}
