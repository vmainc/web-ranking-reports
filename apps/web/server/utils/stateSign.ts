import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const SEP = '.'
/** Google consent + account picking can take a while; keep state valid long enough for slow flows. */
const TTL_MS = 35 * 60 * 1000 // 35 minutes

/** Where to send the browser after a successful Google OAuth callback. */
export type AfterConnectDestination = 'setup' | 'dashboard' | 'business-profile'

export type OAuthStateMode = 'site' | 'account' | 'email_sending'

export interface StatePayload {
  /** Empty when `mode` is `account` or `email_sending`. */
  siteId: string
  userId: string
  nonce: string
  ts: number
  /** Optional post-OAuth redirect (defaults to site dashboard when omitted). */
  afterConnect?: AfterConnectDestination
  /** `account` = user-level Google; `email_sending` = agency Gmail send connection. */
  mode?: OAuthStateMode
  /** Workspace owner id when mode is email_sending. */
  agencyOwnerId?: string
  /** Relative path to return to after email_sending OAuth (e.g. /agency). */
  returnPath?: string
}

function signPayload(secret: string, payload: StatePayload): string {
  const raw = JSON.stringify(payload)
  const b64 = Buffer.from(raw, 'utf8').toString('base64url')
  const sig = createHmac('sha256', secret).update(b64).digest('base64url')
  return `${b64}${SEP}${sig}`
}

export function createState(
  secret: string,
  siteId: string,
  userId: string,
  afterConnect?: AfterConnectDestination,
  mode?: 'site' | 'account',
): string {
  const payload: StatePayload = {
    siteId: mode === 'account' ? '' : siteId,
    userId,
    nonce: randomBytes(16).toString('hex'),
    ts: Date.now(),
    ...(afterConnect ? { afterConnect } : {}),
    ...(mode === 'account' ? { mode: 'account' as const } : {}),
  }
  return signPayload(secret, payload)
}

/** OAuth state for Agency → Email Sending (Gmail). Tied to user + agency owner + return path. */
export function createEmailSendingState(
  secret: string,
  opts: { userId: string; agencyOwnerId: string; returnPath?: string },
): string {
  const returnPath = sanitizeReturnPath(opts.returnPath)
  const payload: StatePayload = {
    siteId: '',
    userId: opts.userId,
    agencyOwnerId: opts.agencyOwnerId,
    returnPath,
    nonce: randomBytes(16).toString('hex'),
    ts: Date.now(),
    mode: 'email_sending',
  }
  return signPayload(secret, payload)
}

export function sanitizeReturnPath(raw?: string): string {
  const fallback = '/agency'
  if (!raw || typeof raw !== 'string') return fallback
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) return fallback
  if (trimmed.length > 200) return fallback
  return trimmed
}

function signaturesMatch(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

export type VerifyStateResult =
  | { ok: true; payload: StatePayload }
  | { ok: false; reason: 'invalid' | 'expired' }

export function verifyStateDetailed(secret: string, state: string): VerifyStateResult {
  if (!state || !secret) return { ok: false, reason: 'invalid' }
  const i = state.lastIndexOf(SEP)
  if (i === -1) return { ok: false, reason: 'invalid' }
  const b64 = state.slice(0, i)
  const sig = state.slice(i + 1)
  const expectedSig = createHmac('sha256', secret).update(b64).digest('base64url')
  if (!signaturesMatch(sig, expectedSig)) return { ok: false, reason: 'invalid' }
  let payload: StatePayload
  try {
    payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as StatePayload
  } catch {
    return { ok: false, reason: 'invalid' }
  }
  if (!payload.userId) return { ok: false, reason: 'invalid' }
  if (Date.now() - payload.ts > TTL_MS) return { ok: false, reason: 'expired' }

  const mode = payload.mode ?? 'site'
  if (mode === 'account') {
    if ((payload.siteId ?? '') !== '') return { ok: false, reason: 'invalid' }
  } else if (mode === 'email_sending') {
    if ((payload.siteId ?? '') !== '') return { ok: false, reason: 'invalid' }
    if (!payload.agencyOwnerId) return { ok: false, reason: 'invalid' }
    if (payload.returnPath != null && sanitizeReturnPath(payload.returnPath) !== payload.returnPath) {
      return { ok: false, reason: 'invalid' }
    }
  } else if (!payload.siteId) {
    return { ok: false, reason: 'invalid' }
  }

  if (
    payload.afterConnect != null &&
    payload.afterConnect !== 'setup' &&
    payload.afterConnect !== 'dashboard' &&
    payload.afterConnect !== 'business-profile'
  ) {
    return { ok: false, reason: 'invalid' }
  }
  return { ok: true, payload }
}

export function verifyState(secret: string, state: string): StatePayload | null {
  const result = verifyStateDetailed(secret, state)
  return result.ok ? result.payload : null
}
