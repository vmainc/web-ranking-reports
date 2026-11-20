import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, getUserEmailForUserId } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { personalizeCampaignHtml, sendCampaignHtmlEmail } from '~/server/utils/campaignEmail'
import { isValidEmailAddress } from '~/server/services/email/agencyEmailIntegration'
import { assertRateLimit } from '~/server/utils/emailSendingRateLimit'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  assertRateLimit({
    key: `email-campaign-test:${userId}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
    message: 'Too many campaign test emails. Try again in a few minutes.',
  })

  const body = (await readBody(event).catch(() => ({}))) as {
    to?: string
    subject?: string
    bodyHtml?: string
    previewFirstName?: string
    previewEmail?: string
  }

  const subject = (body?.subject ?? '').trim()
  const bodyHtml = (body?.bodyHtml ?? '').trim()
  if (!subject) throw createError({ statusCode: 400, message: 'Subject is required.' })
  if (!bodyHtml) throw createError({ statusCode: 400, message: 'Email body is required.' })

  let to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : ''
  if (!to) {
    to = (await getUserEmailForUserId(event, userId)).trim().toLowerCase()
  }
  if (!to) {
    const pb = getAdminPb()
    await adminAuth(pb)
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

  const previewName = (body?.previewFirstName ?? 'Test').trim() || 'Test'
  const previewEmail = (body?.previewEmail ?? to).trim() || to
  const html = personalizeCampaignHtml(bodyHtml, { name: previewName, email: previewEmail })
  const testSubject = subject.startsWith('[Test]') ? subject : `[Test] ${subject}`

  const pb = getAdminPb()
  await adminAuth(pb)
  const agencyOwnerId = await requireCrmOwnerId(pb, userId)

  const result = await sendCampaignHtmlEmail(pb, agencyOwnerId, {
    to,
    subject: testSubject,
    html,
  })

  return {
    ok: true,
    to,
    subject: testSubject,
    provider: result.provider,
    senderEmail: result.senderEmail || null,
  }
})