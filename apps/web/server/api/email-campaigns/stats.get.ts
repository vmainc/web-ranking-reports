import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  try {
    const sentList = await pb.collection('email_campaigns').getFullList<{ sent_at?: string | null; updated: string }>({
      filter: `created_by = "${userId}" && status = "sent"`,
      sort: '-sent_at',
      batch: 200,
    })

    const sentCampaignsCount = sentList.length

    let lastSentAt: string | null = null
    for (const row of sentList) {
      const iso = (row.sent_at || row.updated || '').trim()
      if (iso) {
        lastSentAt = iso
        break
      }
    }

    let daysSinceLast: number | null = null
    if (lastSentAt) {
      const t = new Date(lastSentAt).getTime()
      if (!Number.isNaN(t)) {
        daysSinceLast = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000))
      }
    }

    return { sentCampaignsCount, lastSentAt, daysSinceLast }
  } catch {
    return { sentCampaignsCount: 0, lastSentAt: null as string | null, daysSinceLast: null as number | null }
  }
})
