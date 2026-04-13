import { timingSafeEqual } from 'node:crypto'

/** Escape a value for PocketBase `filter` string literals (double-quoted). */
export function pbFilterString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function constantTimeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function strField(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s.length ? s : null
}

/** Normalize SEOptimer / embed webhook POST fields (flat body). */
export function mapSeoptimerPayload(body: Record<string, unknown>): {
  name: string | null
  email: string | null
  phone: string | null
  website: string | null
  audit_url: string | null
  pdf_report_url: string | null
} {
  const phone =
    strField(body.phone) ??
    strField(body.phone_number) ??
    strField(body.mobile) ??
    strField(body.tel)
  const pdf =
    strField(body.pdf_report_url) ??
    strField(body.pdf_url) ??
    strField(body.pdf) ??
    strField(body.report_pdf) ??
    strField(body.report_pdf_url) ??
    strField(body.audit_pdf_url)
  return {
    name: strField(body.name),
    email: strField(body.email),
    phone,
    website: strField(body.website) ?? strField(body.url) ?? strField(body.domain),
    audit_url: strField(body.audit_url),
    pdf_report_url: pdf,
  }
}

export function redactSeoptimerPayload(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body }
  if ('key' in out) out.key = '[redacted]'
  return out
}
