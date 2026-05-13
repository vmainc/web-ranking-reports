import {
  defineEventHandler,
  getMethod,
  getRequestHeader,
  getRequestURL,
  send,
  setResponseHeaders,
  setResponseStatus,
} from 'h3'

/**
 * Nitro does not answer OPTIONS for `.post.ts`-only routes, so some clients log 404 on preflight.
 * Same-origin fetches normally skip preflight; this keeps OPTIONS harmless for /api/**.
 */
export default defineEventHandler((event) => {
  if (getMethod(event) !== 'OPTIONS') return
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/')) return

  const origin = getRequestHeader(event, 'origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      getRequestHeader(event, 'access-control-request-headers') || 'Authorization, Content-Type, X-WRR-Authorization',
    'Access-Control-Max-Age': '86400',
  }
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
    headers.Vary = 'Origin'
  }
  setResponseHeaders(event, headers)
  setResponseStatus(event, 204)
  return send(event, null)
})
