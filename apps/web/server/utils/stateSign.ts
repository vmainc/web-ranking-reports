import { createHmac, randomBytes } from 'node:crypto'

const SEP = '.'
const TTL_MS = 10 * 60 * 1000 // 10 minutes

export interface StatePayload {
  siteId: string
  userId: string
  nonce: string
  ts: number
}

export function createState(secret: string, siteId: string, userId: string): string {
  const payload: StatePayload = {
    siteId,
    userId,
    nonce: randomBytes(16).toString('hex'),
    ts: Date.now(),
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
  if (!payload.siteId || !payload.userId) return null
  return payload
}
