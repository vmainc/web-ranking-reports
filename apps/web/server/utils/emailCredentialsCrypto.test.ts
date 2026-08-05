import { describe, expect, it } from 'vitest'
import {
  encryptEmailCredential,
  decryptEmailCredential,
  resolveEmailCredentialsKey,
  EmailCredentialsCryptoError,
} from '~/server/utils/emailCredentialsCrypto'

const KEY = 'test-email-credentials-key-32chars!!'

describe('emailCredentialsCrypto', () => {
  it('round-trips plaintext', () => {
    const enc = encryptEmailCredential('refresh-token-value', KEY)
    expect(enc.startsWith('v1:')).toBe(true)
    expect(decryptEmailCredential(enc, KEY)).toBe('refresh-token-value')
  })

  it('produces different ciphertext each time', () => {
    const a = encryptEmailCredential('same', KEY)
    const b = encryptEmailCredential('same', KEY)
    expect(a).not.toBe(b)
  })

  it('fails on wrong key', () => {
    const enc = encryptEmailCredential('secret', KEY)
    expect(() => decryptEmailCredential(enc, 'different-key-also-long-enough!!')).toThrow(
      EmailCredentialsCryptoError,
    )
  })

  it('rejects empty plaintext', () => {
    expect(() => encryptEmailCredential('', KEY)).toThrow(EmailCredentialsCryptoError)
  })

  it('rejects invalid payload', () => {
    expect(() => decryptEmailCredential('not-valid', KEY)).toThrow(EmailCredentialsCryptoError)
  })

  it('derives 32-byte key from hex', () => {
    const hex = 'a'.repeat(64)
    expect(resolveEmailCredentialsKey(hex).length).toBe(32)
  })
})
