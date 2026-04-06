import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { sendTransactionalEmail } from '~/server/utils/sendTransactionalEmail'
import { emailFailureUserMessage } from '~/server/utils/emailFailureUserMessage'

function rangeLabel(range: string, compare: string): string {
  const c = compare !== 'none' ? ' (vs previous period)' : ''
  if (range === 'last_7_days') return 'Last 7 days' + c
  if (range === 'last_28_days') return 'Last 28 days' + c
  if (range === 'last_90_days') return 'Last 90 days' + c
  return range + c
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = event.context.params?.id
  if (!siteId) throw createError({ statusCode: 400, message: 'Missing site id' })

  const body = (await readBody(event).catch(() => ({}))) as {
    to?: string
    range?: string
    compare?: string
    fullReport?: boolean
  }

  const range = typeof body.range === 'string' && body.range ? body.range : 'last_28_days'
  const compareRaw = typeof body.compare === 'string' ? body.compare : 'previous_period'
  const compare = compareRaw === 'none' ? 'none' : 'previous_period'
  const fullReport = body.fullReport === true

  const pb = getAdminPb()
  await adminAuth(pb)

  const { site, canWrite } = await assertSiteAccess(pb, siteId, userId, false)

  const userRecord = (await pb.collection('users').getOne(userId)) as { email?: string }
  const userEmail = typeof userRecord.email === 'string' ? userRecord.email.trim().toLowerCase() : ''

  let to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : ''
  if (!to) to = userEmail
  if (!to || !to.includes('@')) {
    throw createError({ statusCode: 400, message: 'Valid recipient email is required.' })
  }
  if (!canWrite && to !== userEmail) {
    throw createError({ statusCode: 403, message: 'You can only email the report to your own address.' })
  }

  const config = useRuntimeConfig()
  const appUrl = String(config.public?.appUrl || config.appUrl || 'http://localhost:3000').replace(/\/+$/, '')
  let appName = 'Web Ranking Reports'
  try {
    const s = (await pb.settings.getAll()) as { meta?: { appName?: string } }
    if (s.meta?.appName) appName = s.meta.appName
  } catch {
    // ignore
  }

  const qs = new URLSearchParams()
  qs.set('range', range)
  qs.set('compare', compare)
  const path = fullReport ? `/sites/${siteId}/full-report` : `/sites/${siteId}/report`
  const reportUrl = `${appUrl}${path}?${qs.toString()}`

  const reportTitle = `${site.name} — ${rangeLabel(range, compare)}`

  try {
    await sendTransactionalEmail(pb, 'report_ready', to, {
      APP_NAME: appName,
      APP_URL: appUrl,
      REPORT_TITLE: reportTitle,
      SITE_NAME: site.name,
      REPORT_URL: reportUrl,
    })
  } catch (e: unknown) {
    return { ok: true, emailSent: false, warning: emailFailureUserMessage(e, 'report') }
  }

  return { ok: true, emailSent: true, to }
})
