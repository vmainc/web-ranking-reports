import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext } from '~/server/utils/workspace'
import {
  getAgencyEmailIntegration,
  getGoogleEmailOauthConfig,
  isEmailEncryptionConfigured,
  isValidEmailAddress,
  recordAgencyEmailAudit,
  sanitizeHtmlTemplate,
  toSanitizedEmailSettings,
  upsertAgencyEmailIntegration,
} from '~/server/services/email/agencyEmailIntegration'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await requireWorkspaceOwner(pb, userId)
  const ctx = await getWorkspaceContext(pb, userId)

  const body = (await readBody(event).catch(() => ({}))) as {
    deliveryMethod?: string
    senderName?: string
    replyToEmail?: string
    defaultSubjectTemplate?: string
    defaultMessageTemplate?: string
  }

  const existing = await getAgencyEmailIntegration(pb, ctx.ownerId)
  const patch: Record<string, unknown> = {}

  if (body.deliveryMethod != null) {
    const method = body.deliveryMethod === 'google' ? 'google' : body.deliveryMethod === 'system' ? 'system' : null
    if (!method) {
      throw createError({ statusCode: 400, message: 'deliveryMethod must be system or google.' })
    }
    if (method === 'google') {
      if (!getGoogleEmailOauthConfig() || !isEmailEncryptionConfigured()) {
        throw createError({
          statusCode: 503,
          message: 'Google email sending is not configured on this server yet.',
        })
      }
      if (!existing?.sender_email || existing.connection_status === 'disconnected') {
        throw createError({
          statusCode: 400,
          message: 'Connect a Google Account before selecting Connected Google Account.',
        })
      }
      if (existing.connection_status === 'reconnect_required') {
        throw createError({
          statusCode: 400,
          message: 'Reconnect Google Account before using it for delivery.',
        })
      }
    }
    const prev = existing?.delivery_method === 'google' ? 'google' : 'system'
    if (prev !== method) {
      patch.delivery_method = method
      patch.provider = method
      await recordAgencyEmailAudit(pb, {
        agencyOwnerId: ctx.ownerId,
        actorUserId: userId,
        eventType: 'delivery_method_changed',
        metadata: { from: prev, to: method },
      })
    }
  }

  if (body.senderName != null) {
    const name = String(body.senderName).trim().slice(0, 120)
    patch.sender_name = name
  }

  if (body.replyToEmail != null) {
    const reply = String(body.replyToEmail).trim().toLowerCase().slice(0, 320)
    if (reply && !isValidEmailAddress(reply)) {
      throw createError({ statusCode: 400, message: 'Reply-to email is invalid.' })
    }
    patch.reply_to_email = reply
  }

  if (body.defaultSubjectTemplate != null) {
    patch.default_subject_template = String(body.defaultSubjectTemplate).trim().slice(0, 500)
  }

  if (body.defaultMessageTemplate != null) {
    patch.default_message_template = sanitizeHtmlTemplate(String(body.defaultMessageTemplate), 5000)
  }

  // Never accept tokens or sender_email from the client
  delete (patch as { encrypted_access_token?: unknown }).encrypted_access_token
  delete (patch as { encrypted_refresh_token?: unknown }).encrypted_refresh_token
  delete (patch as { sender_email?: unknown }).sender_email

  if (Object.keys(patch).length) {
    await upsertAgencyEmailIntegration(pb, ctx.ownerId, patch, userId)
  }

  const row = await getAgencyEmailIntegration(pb, ctx.ownerId)
  return {
    settings: toSanitizedEmailSettings(row, {
      googleConfigured: Boolean(getGoogleEmailOauthConfig()),
      encryptionConfigured: isEmailEncryptionConfigured(),
    }),
  }
})
