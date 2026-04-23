/**
 * Report builder / preview CSS variables — always driven by Agency → Report branding colors
 * (`/api/agency/branding`), not per-report theme swatches.
 */
export type AgencyReportColors = {
  primary: string
  accent: string
  text: string
  surface: string
}

const FALLBACK: AgencyReportColors = {
  primary: '#2563EB',
  accent: '#1D4ED8',
  text: '#0F172A',
  surface: '#FFFFFF',
}

export function useAgencyReportBranding() {
  const colors = ref<AgencyReportColors | null>(null)

  async function load(opts?: { headers?: Record<string, string> }) {
    try {
      const res = await $fetch<{
        colors?: { primary?: string; accent?: string; text?: string; surface?: string }
      }>('/api/agency/branding', opts?.headers ? { headers: opts.headers } : undefined)
      const c = res?.colors
      colors.value = {
        primary: (c?.primary || FALLBACK.primary).trim(),
        accent: (c?.accent || FALLBACK.accent).trim(),
        text: (c?.text || FALLBACK.text).trim(),
        surface: (c?.surface || FALLBACK.surface).trim(),
      }
    } catch {
      colors.value = { ...FALLBACK }
    }
  }

  const cssVars = computed(() => {
    const c = colors.value ?? FALLBACK
    return {
      '--report-primary': c.primary,
      '--report-accent': c.accent,
      '--report-text': c.text,
      '--report-surface': c.surface,
    } as Record<string, string>
  })

  return { colors, load, cssVars }
}
