import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { dedupeRecipientsByEmail, resolveCampaignRecipients, type RecipientResolutionMode } from '~/server/utils/emailCampaignRecipients'

type Action = 'draft' | 'send_now' | 'schedule'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    name?: string
    subject?: string
    bodyHtml?: string
    recipientMode?: RecipientResolutionMode
    siteId?: string
    tag?: string
    action?: Action
    sendAt?: string
  }

  const name = body?.name?.trim() ?? ''
  const subject = body?.subject?.trim() ?? ''
  const bodyHtml = body?.bodyHtml?.trim() ?? ''
  if (!name) throw createError({ statusCode: 400, message: 'Campaign name is required' })
  if (!subject) throw createError({ statusCode: 400, message: 'Subject is required' })
  if (!bodyHtml) throw createError({ statusCode: 400, message: 'Email body is required' })

  const recipientMode = body?.recipientMode ?? 'all'
  if (!['all', 'site', 'tag'].includes(recipientMode)) {
    throw createError({ statusCode: 400, message: 'Invalid recipient mode' })
  }
  if (recipientMode === 'site' && !(body?.siteId ?? '').trim()) {
    throw createError({ statusCode: 400, message: 'siteId is required for site filter' })
  }
  if (recipientMode === 'tag' && !(body?.tag ?? '').trim()) {
    throw createError({ statusCode: 400, message: 'tag is required for tag filter' })
  }

  const action = body?.action ?? 'draft'
  if (!['draft', 'send_now', 'schedule'].includes(action)) {
    throw createError({ statusCode: 400, message: 'Invalid action' })
  }

  const sendAt = (body?.sendAt ?? '').trim()
  if (action === 'schedule') {
    if (!sendAt) throw createError({ statusCode: 400, message: 'sendAt is required for scheduled campaigns' })
    const t = new Date(sendAt).getTime()
    if (Number.isNaN(t) || t <= Date.now()) {
      throw createError({ statusCode: 400, message: 'sendAt must be a future time' })
    }
  }

  const pb = getAdminPb()
  await adminAuth(pb)

  const rawContacts = await resolveCampaignRecipients(pb, userId, {
    mode: recipientMode,
    siteId: body?.siteId?.trim(),
    tag: body?.tag?.trim(),
  })
  const contacts = dedupeRecipientsByEmail(rawContacts)

  if ((action === 'send_now' || action === 'schedule') && !contacts.length) {
    throw createError({ statusCode: 400, message: 'No contacts with email match this audience' })
  }

  let status: 'draft' | 'scheduled' | 'sending' = 'draft'
  let sendAtStored: string | null = null
  if (action === 'schedule') {
    status = 'scheduled'
    sendAtStored = new Date(sendAt).toISOString()
  } else if (action === 'send_now') {
    status = 'sending'
  }

  const campaign = await pb.collection('email_campaigns').create({
    name,
    subject,
    body_html: bodyHtml,
    status,
    send_at: sendAtStored,
    sent_at: null,
    created_by: userId,
  })

  const campaignId = campaign.id
  for (const c of contacts) {
    const email = (c.email ?? '').trim()
    if (!email) continue
    await pb.collection('email_recipients').create({
      campaign: campaignId,
      contact: c.id,
      email,
      status: 'pending',
      sent_at: null,
    })
  }

  // Draft with zero matching emails: still valid — no recipient rows.
  return { campaign: await pb.collection('email_campaigns').getOne(campaignId) }
})
