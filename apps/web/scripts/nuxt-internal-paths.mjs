/**
 * Node `package.json` → `imports` target for `#internal/nuxt/paths`.
 * Nuxt’s dev server entry (`.nuxt/dist/server/server.mjs`) imports this specifier; Node only
 * resolves it if this package defines it.
 *
 * Must export the same functions as Nuxt’s generated `paths.mjs` (see `publicPathTemplate` in
 * `node_modules/nuxt/dist/index.mjs`). Keep behavior aligned with:
 *   `cdnURL || baseURL` for public assets, `joinRelativeURL(publicAssetsURL(), buildAssetsDir(), …)` for build assets.
 *
 * Use `NUXT_APP_BASE_URL` for the app router base (default `/`). Do **not** map `NUXT_PUBLIC_APP_URL`
 * here — that is often an absolute site URL (e.g. https://…) and would break `/_nuxt/*` CSS in dev.
 */
import { joinRelativeURL } from 'ufo'

function readEnv(...keys) {
  if (typeof process === 'undefined' || !process.env) return ''
  for (const k of keys) {
    const v = process.env[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function appLike() {
  const base = readEnv('NUXT_APP_BASE_URL') || '/'
  const cdn = readEnv('NUXT_APP_CDN_URL', 'NUXT_PUBLIC_APP_CDN_URL')
  const buildAssetsDir = readEnv('NUXT_APP_BUILD_ASSETS_DIR') || '/_nuxt/'
  return { baseURL: base, cdnURL: cdn, buildAssetsDir }
}

export function baseURL() {
  return appLike().baseURL
}

export function buildAssetsDir() {
  return appLike().buildAssetsDir
}

export function publicAssetsURL(...path) {
  const { cdnURL, baseURL: b } = appLike()
  const publicBase = cdnURL || b
  return path.length ? joinRelativeURL(publicBase, ...path) : publicBase
}

export function buildAssetsURL(...path) {
  return joinRelativeURL(publicAssetsURL(), buildAssetsDir(), ...path)
}
