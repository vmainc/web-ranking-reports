import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, getUserEmailForUserId } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext } from '~/server/utils/workspace'
import { resolveEmailProvider } from '~/server/services/email/resolveEmailProvider'
import {
  getAgencyEmailIntegration,
  getGoogleEmailOauthConfig,
  isEmailEncryptionConfigured,
  isValidEmailAddress,
  recordAgencyEmailAudit,
  toSanitizedEmailSettings,
  upsertAgencyEmailIntegration,
} from '~/server/services/email/agencyEmailIntegration'
import { EmailDeliveryError } from '~/server/services/email/types'
import { assertRateLimit } from '~/server/utils/emailSendingRateLimit'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  assertRateLimit({
    key: `email-test:${userId}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
    message: 'Too many test emails. Try again in a few minutes.',
  })

  const pb = getAdminPb()
  await adminAuth(pb)
  await requireWorkspaceOwner(pb, userId)
  const ctx = await getWorkspaceContext(pb, userId)

  const body = (await readBody(event).catch(() => ({}))) as { to?: string }
  let to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : ''
  if (!to) {
    to = (await getUserEmailForUserId(event, userId)).trim().toLowerCase()
  }
  if (!to) {
    try {
      const u = await pb.collection('users').getOne<{ email?: string }>(userId)
      to = (u.email || '').trim().toLowerCase()
    } catch {
      // ignore
    }
  }
  if (!to || !isValidEmailAddress(to)) {
    throw createError({ statusCode: 400, message: 'A valid test recipient email is required.' })
  }

  const resolved = await resolveEmailProvider(pb, ctx.ownerId)
  const nowIso = new Date().toISOString()

  if (!resolved.ok) {
    await upsertAgencyEmailIntegration(
      pb,
      ctx.ownerId,
      { last_test_at: nowIso, last_test_status: 'failed', last_send_error: resolved.error.userMessage.slice(0, 500) },
      userId,
    )
    await recordAgencyEmailAudit(pb, {
      agencyOwnerId: ctx.ownerId,
      actorUserId: userId,
      eventType: 'test_email_failed',
      metadata: { category: resolved.error.category },
    })
    throw createError({
      statusCode: resolved.error.statusCode,
      message: resolved.error.userMessage,
    })
  }

  try {
    const result = await resolved.provider.testConnection(to)
    await upsertAgencyEmailIntegration(
      pb,
      ctx.ownerId,
      { last_test_at: nowIso, last_test_status: 'sent', last_send_error: '' },
      userId,
    )
    await recordAgencyEmailAudit(pb, {
      agencyOwnerId: ctx.ownerId,
      actorUserId: userId,
      eventType: 'test_email_sent',
      metadata: { provider: result.provider, senderEmail: result.senderEmail },
    })
    const row = await getAgencyEmailIntegration(pb, ctx.ownerId)
    return {
      ok: true,
      result: {
        provider: result.provider,
        senderEmail: result.senderEmail,
        messageId: result.messageId || null,
      },
      settings: toSanitizedEmailSettings(row, {
        googleConfigured: Boolean(getGoogleEmailOauthConfig()),
        encryptionConfigured: isEmailEncryptionConfigured(),
      }),
    }
  } catch (e) {
    const err =
      e instanceof EmailDeliveryError
        ? e
        : new EmailDeliveryError({
            category: 'send_failed',
            userMessage: 'Test email failed to send.',
            technicalDetail: e instanceof Error ? e.message.slice(0, 200) : undefined,
          })
    await upsertAgencyEmailIntegration(
      pb,
      ctx.ownerId,
      {
        last_test_at: nowIso,
        last_test_status: 'failed',
        last_send_error: err.userMessage.slice(0, 500),
        ...(err.category === 'connection_revoked' || err.category === 'token_refresh_failed'
          ? { connection_status: 'reconnect_required' }
          : {}),
      },
      userId,
    )
    await recordAgencyEmailAudit(pb, {
      agencyOwnerId: ctx.ownerId,
      actorUserId: userId,
      eventType: 'test_email_failed',
      metadata: { category: err.category },
    })
    throw createError({ statusCode: err.statusCode, message: err.userMessage })
  }
})
