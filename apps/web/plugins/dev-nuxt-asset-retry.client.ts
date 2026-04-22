/**
 * Dev-only: after `nuxt dev` restarts or `npm run build`, an open tab still references old hashed
 * `/_nuxt/*` URLs → 404 and an unstyled page. `experimental.emitRouteChunkError` handles many cases;
 * this catches failed <script>/<link> loads on the initial document as well.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.dev) return

  const KEY = 'wrr-dev-nuxt-asset-reload-once'

  nuxtApp.hook('app:mounted', () => {
    window.setTimeout(() => {
      try {
        sessionStorage.removeItem(KEY)
      } catch {
        /* ignore */
      }
    }, 2500)
  })

  window.addEventListener(
    'error',
    (event) => {
      const t = event.target
      if (!t || !(t instanceof HTMLElement)) return
      if (t.tagName !== 'SCRIPT' && t.tagName !== 'LINK') return
      const url =
        t.tagName === 'SCRIPT' ? (t as HTMLScriptElement).src : (t as HTMLLinkElement).href
      if (!url || !url.includes('/_nuxt/')) return
      try {
        if (sessionStorage.getItem(KEY)) return
        sessionStorage.setItem(KEY, '1')
      } catch {
        return
      }
      console.warn('[dev] Stale Nuxt asset (reload tab after dev restart). Reloading…', url)
      window.location.reload()
    },
    true,
  )
})
