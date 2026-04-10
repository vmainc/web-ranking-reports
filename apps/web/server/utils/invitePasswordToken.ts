import { createHmac, timingSafeEqual } from 'node:crypto'

const TTL_SEC = 14 * 24 * 60 * 60 // 14 days

export type InvitePasswordPayload = { v: 1; uid: string; email: string; exp: number }

function getInviteSigningSecret(): string | null {
  const config = useRuntimeConfig()
  const s = (config.invitePasswordTokenSecret || config.stateSigningSecret || '').trim()
  return s || null
}

export function signInvitePasswordToken(uid: string, email: string): string {
  const secret = getInviteSigningSecret()
  if (!secret) {
    throw createError({
      statusCode: 503,
      message:
        'Invite links require STATE_SIGNING_SECRET (or INVITE_PASSWORD_TOKEN_SECRET) on the server. Set it in apps/web/.env and restart.',
    })
  }
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC
  const payload: InvitePasswordPayload = { v: 1, uid, email: email.trim().toLowerCase(), exp }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyInvitePasswordToken(token: string): InvitePasswordPayload | null {
  const secret = getInviteSigningSecret()
  if (!secret) return null
  const i = token.lastIndexOf('.')
  if (i <= 0) return null
  const body = token.slice(0, i)
  const sig = token.slice(i + 1)
  if (!body || !sig) return null
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(sig, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as InvitePasswordPayload
    if (payload.v !== 1 || typeof payload.uid !== 'string' || typeof payload.email !== 'string') return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
