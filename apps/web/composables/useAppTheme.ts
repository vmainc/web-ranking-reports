export type AppTheme = 'dark' | 'light'

const STORAGE_KEY = 'wrr-app-theme'

const HTML_THEME_CLASSES = ['app-theme-light', 'app-theme-dark', 'app-light', 'app-dark'] as const
const BODY_THEME_CLASSES = ['bg-[#0f172a]', 'text-slate-200', 'bg-surface-50', 'text-surface-800'] as const

export function useAppTheme() {
  const theme = useState<AppTheme>('app-theme', () => 'dark')

  const isDark = computed(() => theme.value === 'dark')
  const isLight = computed(() => theme.value === 'light')

  function applyTheme(next: AppTheme) {
    if (!import.meta.client) return

    const root = document.documentElement
    for (const c of HTML_THEME_CLASSES) root.classList.remove(c)
    if (next === 'light') root.classList.add('app-theme-light')
    else root.classList.add('app-theme-dark')

    for (const c of BODY_THEME_CLASSES) document.body.classList.remove(c)
    if (next === 'light') {
      document.body.classList.add('bg-surface-50', 'text-surface-800')
    } else {
      document.body.classList.add('bg-[#0f172a]', 'text-slate-200')
    }

    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore quota / private mode */
    }
  }

  function readStoredTheme(): AppTheme | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === 'light' || raw === 'dark') return raw
    } catch {
      /* ignore */
    }
    return null
  }

  function initTheme() {
    if (!import.meta.client) return

    // Prefer stored preference; fall back to class already set by the boot script.
    const fromDom = document.documentElement.classList.contains('app-theme-light') ? 'light' : null
    const next = readStoredTheme() ?? fromDom ?? 'dark'
    theme.value = next
    applyTheme(next)
  }

  function setTheme(next: AppTheme) {
    theme.value = next
    applyTheme(next)
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, isDark, isLight, initTheme, setTheme, toggleTheme }
}
