/**
 * Authenticated encryption for agency email OAuth tokens (server-only).
 * Format: v1:<iv_b64url>:<tag_b64url>:<ciphertext_b64url>
 */
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

const VERSION = 'v1'
const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

export class EmailCredentialsCryptoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmailCredentialsCryptoError'
  }
}

function readEncryptionKeyRaw(): string {
  if (typeof process === 'undefined' || !process.env) {
    throw new EmailCredentialsCryptoError('EMAIL_CREDENTIALS_ENCRYPTION_KEY is not available.')
  }
  const fromEnv =
    (process.env.EMAIL_CREDENTIALS_ENCRYPTION_KEY || process.env.NUXT_EMAIL_CREDENTIALS_ENCRYPTION_KEY || '').trim()
  if (fromEnv) return fromEnv
  try {
    const config = useRuntimeConfig()
    const fromConfig = typeof config.emailCredentialsEncryptionKey === 'string' ? config.emailCredentialsEncryptionKey.trim() : ''
    if (fromConfig) return fromConfig
  } catch {
    // outside Nitro
  }
  throw new EmailCredentialsCryptoError(
    'EMAIL_CREDENTIALS_ENCRYPTION_KEY is not set. Add a 32+ character secret to the server environment.',
  )
}

/** Derive a stable 32-byte key from the configured secret (hex, base64, or arbitrary string). */
export function resolveEmailCredentialsKey(raw?: string): Buffer {
  const secret = (raw ?? readEncryptionKeyRaw()).trim()
  if (!secret || secret.length < 16) {
    throw new EmailCredentialsCryptoError('EMAIL_CREDENTIALS_ENCRYPTION_KEY must be at least 16 characters.')
  }
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, 'hex')
  }
  try {
    const b64 = Buffer.from(secret, 'base64')
    if (b64.length === 32) return b64
  } catch {
    // fall through
  }
  return createHash('sha256').update(secret, 'utf8').digest()
}

export function encryptEmailCredential(plaintext: string, keyRaw?: string): string {
  if (typeof plaintext !== 'string' || !plaintext) {
    throw new EmailCredentialsCryptoError('Cannot encrypt empty credential.')
  }
  const key = resolveEmailCredentialsKey(keyRaw)
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':')
}

export function decryptEmailCredential(payload: string, keyRaw?: string): string {
  if (typeof payload !== 'string' || !payload.trim()) {
    throw new EmailCredentialsCryptoError('Cannot decrypt empty credential payload.')
  }
  const parts = payload.trim().split(':')
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new EmailCredentialsCryptoError('Unsupported or invalid encrypted credential format.')
  }
  const [, ivB64, tagB64, ctB64] = parts
  const key = resolveEmailCredentialsKey(keyRaw)
  let iv: Buffer
  let tag: Buffer
  let ciphertext: Buffer
  try {
    iv = Buffer.from(ivB64, 'base64url')
    tag = Buffer.from(tagB64, 'base64url')
    ciphertext = Buffer.from(ctB64, 'base64url')
  } catch {
    throw new EmailCredentialsCryptoError('Invalid encrypted credential encoding.')
  }
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN || ciphertext.length === 0) {
    throw new EmailCredentialsCryptoError('Invalid encrypted credential structure.')
  }
  try {
    const decipher = createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    throw new EmailCredentialsCryptoError('Credential decryption failed. Check EMAIL_CREDENTIALS_ENCRYPTION_KEY.')
  }
}
