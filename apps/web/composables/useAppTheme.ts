export type AppTheme = 'dark' | 'light'

const STORAGE_KEY = 'wrr-app-theme'

export function useAppTheme() {
  const theme = useState<AppTheme>('app-theme', () => 'dark')

  const isDark = computed(() => theme.value === 'dark')
  const isLight = computed(() => theme.value === 'light')

  function applyTheme(next: AppTheme) {
    if (!import.meta.client) return

    const root = document.documentElement
    root.classList.toggle('app-theme-light', next === 'light')
    root.classList.toggle('app-theme-dark', next === 'dark')

    document.body.classList.toggle('bg-[#0f172a]', next === 'dark')
    document.body.classList.toggle('text-slate-200', next === 'dark')
    document.body.classList.toggle('bg-surface-50', next === 'light')
    document.body.classList.toggle('text-surface-800', next === 'light')

    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore quota / private mode */
    }
  }

  function initTheme() {
    if (!import.meta.client) return

    let stored: AppTheme | null = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === 'light' || raw === 'dark') stored = raw
    } catch {
      stored = null
    }

    const next = stored ?? 'dark'
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
