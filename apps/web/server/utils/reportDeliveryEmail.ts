import type PocketBase from 'pocketbase'
import { REPORT_BUILDER_PAYLOAD_KEY } from '~/types/reportBuilder'
import {
  buildDeliveryEmailHtml,
  deliveryEmailBodyToHtml,
  deliveryEmailPlainText,
  mergeDeliveryEmailSettings,
  renderDeliveryEmailTokens,
  type ReportDeliveryEmailSettings,
} from '~/utils/reportDeliveryEmail'

export type ResolvedReportDeliveryEmail = {
  settings: ReportDeliveryEmailSettings
  subject: string
  html: string
  text: string
  logoUrl: string
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function deliveryEmailFromReportPayload(payload: unknown): ReportDeliveryEmailSettings {
  if (!isRecord(payload)) return mergeDeliveryEmailSettings(null)
  const rb = payload[REPORT_BUILDER_PAYLOAD_KEY]
  if (!isRecord(rb)) return mergeDeliveryEmailSettings(null)
  const de = rb.deliveryEmail
  return mergeDeliveryEmailSettings(isRecord(de) ? (de as Partial<ReportDeliveryEmailSettings>) : null)
}

export async function loadReportDeliveryEmailSettings(
  pb: PocketBase,
  reportId: string,
): Promise<ReportDeliveryEmailSettings> {
  try {
    const row = await pb.collection('reports').getOne<{ payload_json?: unknown }>(reportId, {
      fields: 'payload_json',
    })
    return deliveryEmailFromReportPayload(row.payload_json)
  } catch {
    return mergeDeliveryEmailSettings(null)
  }
}

export function resolveReportDeliveryEmail(opts: {
  settings: ReportDeliveryEmailSettings
  siteName: string
  reportTitle: string
  themeLogoUrl?: string
  agencyLogoUrl?: string
  appName: string
  primaryColor?: string
  openReportUrl?: string
  trackingPixelUrl?: string
}): ResolvedReportDeliveryEmail {
  const dateLabel = new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })
  const vars = {
    site: opts.siteName,
    date: dateLabel,
    reportTitle: opts.reportTitle,
  }
  const subject = renderDeliveryEmailTokens(opts.settings.subject || '{{reportTitle}}', vars).slice(0, 200)
  const bodyRendered = renderDeliveryEmailTokens(opts.settings.body, vars)
  const logoUrl =
    opts.settings.logoUrl.trim() ||
    (opts.themeLogoUrl?.trim() ?? '') ||
    (opts.agencyLogoUrl?.trim() ?? '')
  const bodyHtml = deliveryEmailBodyToHtml(bodyRendered)
  const html = buildDeliveryEmailHtml({
    bodyHtml,
    logoUrl: logoUrl || undefined,
    showLogo: opts.settings.showLogo,
    showOpenLink: opts.settings.showOpenLink,
    openReportUrl: opts.openReportUrl,
    primaryColor: opts.primaryColor,
    appName: opts.appName,
    trackingPixelUrl: opts.trackingPixelUrl,
  })
  const text = deliveryEmailPlainText(bodyRendered, opts.appName, opts.openReportUrl)
  return { settings: opts.settings, subject, html, text, logoUrl }
}
