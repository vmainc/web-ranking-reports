import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext } from '~/server/utils/workspace'
import { decryptEmailCredential } from '~/server/utils/emailCredentialsCrypto'
import {
  getAgencyEmailIntegration,
  getGoogleEmailOauthConfig,
  isEmailEncryptionConfigured,
  recordAgencyEmailAudit,
  toSanitizedEmailSettings,
  upsertAgencyEmailIntegration,
} from '~/server/services/email/agencyEmailIntegration'
import { assertRateLimit } from '~/server/utils/emailSendingRateLimit'

async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  } catch {
    // best-effort
  }
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  assertRateLimit({
    key: `email-oauth-disconnect:${userId}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  })

  const pb = getAdminPb()
  await adminAuth(pb)
  await requireWorkspaceOwner(pb, userId)
  const ctx = await getWorkspaceContext(pb, userId)

  const existing = await getAgencyEmailIntegration(pb, ctx.ownerId)
  if (existing?.encrypted_refresh_token || existing?.encrypted_access_token) {
    for (const field of ['encrypted_refresh_token', 'encrypted_access_token'] as const) {
      const enc = existing[field]
      if (!enc) continue
      try {
        const plain = decryptEmailCredential(enc)
        await revokeGoogleToken(plain)
      } catch {
        // ignore decrypt/revoke failures
      }
    }
  }

  await upsertAgencyEmailIntegration(
    pb,
    ctx.ownerId,
    {
      provider: 'system',
      delivery_method: 'system',
      sender_email: '',
      google_account_id: '',
      encrypted_access_token: '',
      encrypted_refresh_token: '',
      token_expiry: '',
      scopes: '',
      connection_status: 'disconnected',
      last_send_error: '',
    },
    userId,
  )

  await recordAgencyEmailAudit(pb, {
    agencyOwnerId: ctx.ownerId,
    actorUserId: userId,
    eventType: 'google_disconnected',
    metadata: {},
  })

  const row = await getAgencyEmailIntegration(pb, ctx.ownerId)
  return {
    settings: toSanitizedEmailSettings(row, {
      googleConfigured: Boolean(getGoogleEmailOauthConfig()),
      encryptionConfigured: isEmailEncryptionConfigured(),
    }),
  }
})
