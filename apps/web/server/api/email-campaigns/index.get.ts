import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import type { EmailCampaignListItem } from '~/types'

type Row = {
  id: string
  name: string
  subject: string
  body_html: string
  status: string
  send_at?: string | null
  sent_at?: string | null
  created_by: string
  created: string
  updated: string
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  let campaigns: Row[] = []
  try {
    campaigns = await pb.collection('email_campaigns').getFullList<Row>({
      filter: `created_by = "${userId}"`,
      sort: '-created',
      batch: 100,
    })
  } catch {
    return { campaigns: [] as EmailCampaignListItem[] }
  }

  const out: EmailCampaignListItem[] = []
  for (const c of campaigns) {
    let recipientCount = 0
    let sentRecipientCount = 0
    try {
      const all = await pb.collection('email_recipients').getList(1, 1, { filter: `campaign = "${c.id}"` })
      recipientCount = all.totalItems
      const sent = await pb.collection('email_recipients').getList(1, 1, {
        filter: `campaign = "${c.id}" && status = "sent"`,
      })
      sentRecipientCount = sent.totalItems
    } catch {
      // ignore per-campaign count errors
    }
    out.push({
      ...c,
      status: c.status as EmailCampaignListItem['status'],
      recipientCount,
      sentRecipientCount,
    })
  }

  return { campaigns: out }
})
