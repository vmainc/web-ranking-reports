import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { saveWebsiteAuditFormSettings } from '~/server/utils/websiteAuditForm'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PUT' && getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  }
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    enabled?: boolean
    headline?: string
    subheadline?: string
    buttonLabel?: string
    successMessage?: string
    redirectUrl?: string
    collectPhone?: boolean
    notifyOwnerEmail?: boolean
    ownerNotifyEmail?: string
    rotateKey?: boolean
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)
  const settings = await saveWebsiteAuditFormSettings(pb, ownerId, body)

  const config = useRuntimeConfig()
  const appUrl = String(config.public?.appUrl || config.appUrl || 'http://localhost:3000').replace(/\/+$/, '')
  const formUrl = `${appUrl}/website-audit/${encodeURIComponent(settings.publicKey)}`
  const scriptUrl = `${appUrl}/website-audit/embed.js`

  return {
    settings,
    embed: {
      formUrl,
      scriptUrl,
      iframeSnippet: `<iframe src="${formUrl}" title="Website audit" style="width:100%;min-height:560px;border:0;border-radius:12px;" loading="lazy"></iframe>`,
      scriptSnippet: `<div data-wrr-audit="${settings.publicKey}"></div>\n<script src="${scriptUrl}" async></script>`,
    },
  }
})
