import type PocketBase from 'pocketbase'

/** Ensures a reports row exists and belongs to the given site (for PDF / email). */
export async function assertReportOnSite(pb: PocketBase, reportId: string, siteId: string) {
  const report = await pb.collection('reports').getOne(reportId)
  const sid = typeof report.site === 'string' ? report.site : (report.site as { id?: string } | undefined)?.id
  if (!sid || sid !== siteId) {
    throw createError({ statusCode: 400, message: 'Report does not belong to this site.' })
  }
  return report
}
