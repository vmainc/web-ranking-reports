import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { assertProposalOwned, freezeProposalSnapshot, newPublicToken } from '~/server/utils/proposals'
import { generateProposalPdfBuffer } from '~/server/utils/proposalPdf'

/** Export proposal PDF. Does not burn monthly report quota. */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  let proposal = await assertProposalOwned(pb, id, crmOwnerId)
  if (!(proposal as { snapshot_json?: unknown }).snapshot_json) {
    proposal = await freezeProposalSnapshot(
      pb,
      proposal as { id: string; client?: unknown; site?: unknown },
      crmOwnerId,
    )
  }

  let token = String((proposal as { public_token?: string }).public_token || '')
  if (!token) {
    token = newPublicToken()
    proposal = await pb.collection('proposals').update(id, { public_token: token })
  }

  // Token is a capability URL; public GET allows draft so agency PDF preview works before send.
  const config = useRuntimeConfig()
  const appUrl = String(config.public?.appUrl || config.appUrl || 'http://localhost:3000').replace(/\/+$/, '')
  const { buffer, filename } = await generateProposalPdfBuffer({
    appUrl,
    publicToken: token,
    title: (proposal as { title?: string }).title,
  })

  await pb.collection('proposals').update(id, { pdf_filename: filename }).catch(() => null)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
    },
  })
})
