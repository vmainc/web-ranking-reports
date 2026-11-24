/** Client mirror of `arePlansEnabled()` — plans/trials/limits off unless explicitly enabled. */
export function usePlansMode() {
  const config = useRuntimeConfig()
  const plansEnabled = computed(() => config.public.plansEnabled === true)
  return { plansEnabled }
}