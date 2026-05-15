import type PocketBase from 'pocketbase'

type CrmClientRow = {
  id: string
  email?: string | null
  site?: string | null
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function clientEmail(client: CrmClientRow): string {
  return typeof client.email === 'string' ? normalizeEmail(client.email) : ''
}

/**
 * After a report email is delivered, append a CRM timeline entry when we can match a client
 * by linked site and/or recipient email.
 */
export async function logCrmReportSent(
  pb: PocketBase,
  opts: {
    crmOwnerId: string
    siteId: string
    recipientEmail: string
    reportLabel: string
    happenedAt?: string
  },
): Promise<void> {
  const { crmOwnerId, siteId, reportLabel } = opts
  const recipient = normalizeEmail(opts.recipientEmail)
  if (!recipient || !recipient.includes('@')) return

  const happenedAt = opts.happenedAt ?? new Date().toISOString()

  let clients: CrmClientRow[] = []
  try {
    clients = await pb.collection('crm_clients').getFullList<CrmClientRow>({
      filter: `user = ${JSON.stringify(crmOwnerId)}`,
      fields: 'id,email,site',
    })
  } catch {
    return
  }

  const bySite = clients.find((c) => c.site === siteId)
  const byEmail = clients.find((c) => clientEmail(c) === recipient)
  const client = bySite ?? byEmail
  if (!client) return

  const summary = reportLabel.trim() || 'Report emailed'

  try {
    await pb.collection('crm_contact_points').create({
      user: crmOwnerId,
      client: client.id,
      kind: 'report_sent',
      happened_at: happenedAt,
      summary,
    })
    await pb.collection('crm_clients').update(client.id, { last_activity_at: happenedAt })
  } catch (e) {
    console.warn('[crm] log report_sent failed', e)
  }
}
