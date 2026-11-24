/**
 * When public `plansEnabled` is false (default), the app runs in solo / internal mode:
 * no tier limits, trials, or billing locks. Set NUXT_PUBLIC_PLANS_ENABLED=true for SaaS behavior.
 */
export function arePlansEnabled(event?: import('h3').H3Event): boolean {
  const config = useRuntimeConfig(event)
  return config.public.plansEnabled === true
}