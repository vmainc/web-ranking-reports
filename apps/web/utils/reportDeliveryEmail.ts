/** Client email sent with report PDFs — stored on `payload_json.reportBuilder.deliveryEmail`. */

export const DELIVERY_EMAIL_TOKENS = ['site', 'date', 'reportTitle'] as const

export interface ReportDeliveryEmailSettings {
  subject: string
  /** Plain text; blank lines become paragraphs. Supports {{site}}, {{date}}, {{reportTitle}}. */
  body: string
  /** When empty, report theme logo URL or agency logo is used in the email. */
  logoUrl: string
  showLogo: boolean
  /** Include “Open report” link when a URL is available (scheduled sends). */
  showOpenLink: boolean
}

export const DEFAULT_DELIVERY_EMAIL: ReportDeliveryEmailSettings = {
  subject: '{{reportTitle}}',
  body: 'Hi,\n\nYour report for {{site}} is attached as a PDF.\n\nThank you!',
  logoUrl: '',
  showLogo: true,
  showOpenLink: true,
}

export function mergeDeliveryEmailSettings(
  partial?: Partial<ReportDeliveryEmailSettings> | null,
): ReportDeliveryEmailSettings {
  const p = partial && typeof partial === 'object' ? partial : {}
  return {
    subject:
      typeof p.subject === 'string' && p.subject.trim() ? p.subject.trim() : DEFAULT_DELIVERY_EMAIL.subject,
    body: typeof p.body === 'string' ? p.body : DEFAULT_DELIVERY_EMAIL.body,
    logoUrl: typeof p.logoUrl === 'string' ? p.logoUrl.trim() : '',
    showLogo: typeof p.showLogo === 'boolean' ? p.showLogo : DEFAULT_DELIVERY_EMAIL.showLogo,
    showOpenLink: typeof p.showOpenLink === 'boolean' ? p.showOpenLink : DEFAULT_DELIVERY_EMAIL.showOpenLink,
  }
}

export function escapeDeliveryEmailHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderDeliveryEmailTokens(template: string, vars: Record<string, string>): string {
  let out = template
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi'), v)
  }
  return out
}

export function deliveryEmailBodyToHtml(body: string): string {
  const chunks = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  if (!chunks.length) return '<p></p>'
  return chunks
    .map((p) => `<p style="margin:0 0 1em;line-height:1.5;">${escapeDeliveryEmailHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export type BuildDeliveryEmailHtmlOpts = {
  bodyHtml: string
  logoUrl?: string
  showLogo: boolean
  showOpenLink: boolean
  openReportUrl?: string
  primaryColor?: string
  appName: string
  trackingPixelUrl?: string
}

export function buildDeliveryEmailHtml(opts: BuildDeliveryEmailHtmlOpts): string {
  const primary = opts.primaryColor?.trim() || '#2563eb'
  const logoBlock =
    opts.showLogo && opts.logoUrl?.trim()
      ? `<p style="margin:0 0 20px;"><img src="${escapeDeliveryEmailHtml(opts.logoUrl.trim())}" alt="" style="max-height:56px;max-width:220px;height:auto;width:auto;" /></p>`
      : ''
  const openBlock =
    opts.showOpenLink && opts.openReportUrl?.trim()
      ? `<p style="margin:1.25em 0 0;"><a href="${escapeDeliveryEmailHtml(opts.openReportUrl.trim())}" style="display:inline-block;padding:10px 18px;background:${primary};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Open report</a></p>`
      : ''
  const pixel =
    opts.trackingPixelUrl?.trim()
      ? `<img src="${escapeDeliveryEmailHtml(opts.trackingPixelUrl.trim())}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;" />`
      : ''

  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;color:#18181b;max-width:560px;">
${logoBlock}
${opts.bodyHtml}
${openBlock}
<p style="color:#71717a;font-size:12px;margin-top:1.75em;">Sent from ${escapeDeliveryEmailHtml(opts.appName)}.</p>
${pixel}
</div>`
}

export function deliveryEmailPlainText(body: string, appName: string, openReportUrl?: string): string {
  const rendered = body.trim()
  const lines = [rendered, '', `Sent from ${appName}.`]
  if (openReportUrl?.trim()) lines.splice(2, 0, '', `Open report: ${openReportUrl.trim()}`)
  return lines.join('\n')
}
