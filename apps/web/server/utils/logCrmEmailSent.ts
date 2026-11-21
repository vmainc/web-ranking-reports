import type PocketBase from 'pocketbase'
import { escPbFilterId } from '~/server/utils/workspace'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export type LogCrmEmailSentOpts = {
  crmOwnerId: string
  recipientEmail: string
  subject: string
  /** CRM client id when known (campaign recipient contact). */
  clientId?: string | null
  /** e.g. campaign name, or "Campaign test". */
  context?: string | null
  happenedAt?: string
}

/**
 * After a marketing email is delivered, log `kind: email` on the matched CRM contact timeline.
 */
export async function logCrmEmailSent(pb: PocketBase, opts: LogCrmEmailSentOpts): Promise<void> {
  const { crmOwnerId, subject } = opts
  const recipient = normalizeEmail(opts.recipientEmail)
  if (!recipient.includes('@')) return

  const happenedAt = opts.happenedAt ?? new Date().toISOString()
  const subj = (subject || '').trim() || '(no subject)'
  const ctx = (opts.context || '').trim()
  const summary = ctx ? `Email sent — ${ctx}: ${subj}` : `Email sent: ${subj}`

  let clientId = typeof opts.clientId === 'string' ? opts.clientId.trim() : ''
  if (clientId) {
    try {
      const row = await pb.collection('crm_clients').getOne<{ user?: string }>(clientId)
      const uid = typeof row.user === 'string' ? row.user : ''
      if (uid !== crmOwnerId) clientId = ''
    } catch {
      clientId = ''
    }
  }

  if (!clientId) {
    try {
      const escEmail = recipient.replace(/"/g, '\\"')
      const list = await pb.collection('crm_clients').getList<{ id: string }>(1, 1, {
        filter: `user = "${escPbFilterId(crmOwnerId)}" && email = "${escEmail}"`,
      })
      clientId = list.items[0]?.id ?? ''
    } catch {
      clientId = ''
    }
  }

  if (!clientId) return

  try {
    await pb.collection('crm_contact_points').create({
      user: crmOwnerId,
      client: clientId,
      kind: 'email',
      happened_at: happenedAt,
      summary: summary.slice(0, 5000),
    })
    await pb.collection('crm_clients').update(clientId, { last_activity_at: happenedAt })
  } catch (e) {
    console.warn('[crm] log email activity failed', e)
  }
}