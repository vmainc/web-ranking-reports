import type { Report } from '~/types'
import type { ReportBuilderModel } from '~/types/reportBuilder'
import { hydrateReportBuilder, serializeReportBuilder } from '~/utils/reportBuilderPayload'

type Headers = Record<string, string>

/**
 * Loads the PocketBase report row (auth via caller-supplied headers).
 */
export async function getReportById(reportId: string, headers: Headers): Promise<Report & { payload_json?: Record<string, unknown> }> {
  return await $fetch<Report & { payload_json?: Record<string, unknown> }>(`/api/reports/${reportId}`, { headers })
}

export function builderModelFromReport(report: Report & { payload_json?: Record<string, unknown> }): ReportBuilderModel {
  return hydrateReportBuilder(report)
}

/**
 * Persists builder state into `reports.payload_json` without dropping unrelated keys.
 */
export async function saveReport(
  reportId: string,
  model: ReportBuilderModel,
  existingPayload: Record<string, unknown> | undefined,
  headers: Headers,
): Promise<void> {
  const payload_json = {
    ...(existingPayload && typeof existingPayload === 'object' ? existingPayload : {}),
    ...serializeReportBuilder(model),
  }
  await $fetch(`/api/reports/${reportId}`, {
    method: 'PATCH',
    headers,
    body: { payload_json },
  })
}

/**
 * Creates a new report for a site (same as dashboard flow); returns the new id.
 */
export async function createReport(siteId: string, headers: Headers): Promise<{ id: string }> {
  const { report } = await $fetch<{ report: { id: string } }>('/api/reports/create', {
    method: 'POST',
    headers,
    body: { siteId },
  })
  return { id: report.id }
}
