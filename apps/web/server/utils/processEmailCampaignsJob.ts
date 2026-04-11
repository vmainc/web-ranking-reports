import type PocketBase from 'pocketbase'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { personalizeCampaignHtml, sendEmail } from '~/server/utils/campaignEmail'

type CampaignRow = {
  id: string
  status: string
  send_at?: string | null
  subject: string
  body_html: string
}

type RecipientRow = {
  id: string
  campaign: string
  email: string
  status: string
  contact: string
}

function batchSize(): number {
  const n = parseInt(process.env.EMAIL_CAMPAIGNS_BATCH_SIZE || '25', 10)
  if (Number.isFinite(n) && n >= 1 && n <= 50) return n
  return 25
}

/**
 * Loads contact name for personalization (admin PB).
 */
async function loadContactName(pb: PocketBase, contactId: string): Promise<string> {
  try {
    const r = await pb.collection('crm_clients').getOne<{ name?: string }>(contactId)
    return (r.name ?? '').trim()
  } catch {
    return ''
  }
}

/**
 * Cron worker: move due scheduled campaigns to sending, then send pending recipients in small batches.
 * Does not send an entire campaign in one tick — only up to EMAIL_CAMPAIGNS_BATCH_SIZE per campaign per run.
 */
export async function runProcessEmailCampaignsJob(): Promise<void> {
  const pb = getAdminPb()
  try {
    await adminAuth(pb)
  } catch (e) {
    console.error('[email-campaigns-cron] PocketBase admin auth failed', e)
    return
  }

  const nowIso = new Date().toISOString()
  const batch = batchSize()

  let dueScheduled: CampaignRow[] = []
  try {
    dueScheduled = await pb.collection('email_campaigns').getFullList<CampaignRow>({
      filter: `status = "scheduled" && send_at != null && send_at <= ${JSON.stringify(nowIso)}`,
      batch: 50,
    })
  } catch (e) {
    console.warn('[email-campaigns-cron] email_campaigns query failed (collection missing?)', e)
    return
  }

  // Promote due schedules to sending so they share the same send path as "send now".
  for (const c of dueScheduled) {
    try {
      await pb.collection('email_campaigns').update(c.id, { status: 'sending' })
    } catch (e) {
      console.warn(`[email-campaigns-cron] failed to promote campaign ${c.id}`, e)
    }
  }

  let sending: CampaignRow[] = []
  try {
    sending = await pb.collection('email_campaigns').getFullList<CampaignRow>({
      filter: 'status = "sending"',
      batch: 50,
    })
  } catch {
    return
  }

  if (!sending.length) return

  for (const campaign of sending) {
    let slice: RecipientRow[] = []
    try {
      const page = await pb.collection('email_recipients').getList<RecipientRow>(1, batch, {
        filter: `campaign = "${campaign.id}" && status = "pending"`,
        sort: 'created',
      })
      slice = page.items
    } catch (e) {
      console.warn(`[email-campaigns-cron] recipients query failed for ${campaign.id}`, e)
      continue
    }

    if (!slice.length) {
      // No more pending — mark campaign finished.
      try {
        await pb.collection('email_campaigns').update(campaign.id, {
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
      } catch (e) {
        console.warn(`[email-campaigns-cron] failed to finalize campaign ${campaign.id}`, e)
      }
      continue
    }

    // Send at most `batch` messages this tick for this campaign (stay under provider rate limits).
    for (const rec of slice) {
      const contactId = typeof rec.contact === 'string' ? rec.contact : ''
      const name = contactId ? await loadContactName(pb, contactId) : ''
      const html = personalizeCampaignHtml(campaign.body_html, { name, email: rec.email })
      try {
        await sendEmail(rec.email, campaign.subject, html)
        await pb.collection('email_recipients').update(rec.id, {
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
      } catch (e) {
        console.warn(`[email-campaigns-cron] send failed for recipient ${rec.id}`, e)
        try {
          await pb.collection('email_recipients').update(rec.id, { status: 'failed' })
        } catch {
          // ignore
        }
      }
    }

    try {
      const remaining = await pb.collection('email_recipients').getList(1, 1, {
        filter: `campaign = "${campaign.id}" && status = "pending"`,
      })
      if (remaining.totalItems === 0) {
        await pb.collection('email_campaigns').update(campaign.id, {
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
      }
    } catch (e) {
      console.warn(`[email-campaigns-cron] pending check failed for ${campaign.id}`, e)
    }
  }
}
