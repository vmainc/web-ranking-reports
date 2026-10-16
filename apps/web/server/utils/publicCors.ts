import type { H3Event } from 'h3'
import { getRequestHeader, setResponseHeaders } from 'h3'

/** Allow browser embeds (Breakdance / WordPress) to call public WRR APIs cross-origin. */
export function applyPublicCors(event: H3Event): void {
  const origin = getRequestHeader(event, 'origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Allow-Headers':
      getRequestHeader(event, 'access-control-request-headers') || 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers.Vary = 'Origin'
  } else {
    headers['Access-Control-Allow-Origin'] = '*'
  }
  setResponseHeaders(event, headers)
}
