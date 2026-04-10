/**
 * Node import-map target for `#internal/nuxt/paths` when tools mistakenly execute
 * `.nuxt/dist/server/server.mjs` directly. Nuxt does not define this on the app package.
 *
 * Prefer: `npm run dev` or `npm run start` (after build), not `node .nuxt/dist/...`.
 */
export function baseURL() {
  const v = typeof process !== 'undefined' ? (process.env.NUXT_APP_BASE_URL || process.env.NUXT_PUBLIC_APP_URL || '').trim() : ''
  return v || ''
}
