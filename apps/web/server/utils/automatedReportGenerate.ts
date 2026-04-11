import type PocketBase from 'pocketbase'

/**
 * Stub: pull latest rank snapshot and store an `automated` report row.
 * Extend later with PDF + email.
 */
export async function generateAutomatedReport(pb: PocketBase, siteId: string): Promise<{ reportId: string }> {
  const rows = await pb.collection('rank_keywords').getFullList<{ keyword?: string; last_position?: number }>({
    filter: `site = "${siteId.replace(/"/g, '\\"')}"`,
    batch: 500,
  })

  const now = new Date().toISOString()
  const day = now.slice(0, 10)
  const payload = {
    automated: true,
    snapshot_at: now,
    keyword_count: rows.length,
    keywords: rows.slice(0, 100).map((r) => ({
      keyword: typeof r.keyword === 'string' ? r.keyword : '',
      position: typeof r.last_position === 'number' ? r.last_position : null,
    })),
  }

  const report = await pb.collection('reports').create({
    site: siteId,
    type: 'automated',
    period_start: day,
    period_end: day,
    payload_json: payload,
  })

  return { reportId: report.id }
}
