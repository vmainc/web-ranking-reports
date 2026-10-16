import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { getWebsiteAuditFormSettings } from '~/server/utils/websiteAuditForm'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)
  const settings = await getWebsiteAuditFormSettings(pb, ownerId)

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
