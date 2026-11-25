/**
 * After deploy, an open tab can reference stale hashed `/_nuxt/*` URLs (404/503) and break navigation.
 * One hard reload usually fixes it; this does that automatically once per session.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.dev) return

  const KEY = 'wrr-nuxt-asset-reload-once'

  nuxtApp.hook('app:mounted', () => {
    window.setTimeout(() => {
      try {
        sessionStorage.removeItem(KEY)
      } catch {
        /* ignore */
      }
    }, 3000)
  })

  function maybeReload(url: string) {
    if (!url.includes('/_nuxt/')) return
    try {
      if (sessionStorage.getItem(KEY)) return
      sessionStorage.setItem(KEY, '1')
    } catch {
      return
    }
    console.warn('[app] Stale Nuxt asset after deploy. Reloading…', url)
    window.location.reload()
  }

  window.addEventListener(
    'error',
    (event) => {
      const t = event.target
      if (!t || !(t instanceof HTMLElement)) return
      if (t.tagName !== 'SCRIPT' && t.tagName !== 'LINK') return
      const url =
        t.tagName === 'SCRIPT' ? (t as HTMLScriptElement).src : (t as HTMLLinkElement).href
      if (url) maybeReload(url)
    },
    true,
  )
})