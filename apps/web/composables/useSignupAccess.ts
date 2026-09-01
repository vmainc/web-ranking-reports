import { signupHrefForConfig, type SignupPlan } from '~/utils/signupAccess'

export function useSignupAccess() {
  const config = useRuntimeConfig()

  const registrationEnabled = computed(() => config.public.registrationEnabled === true)

  function signupHref(plan?: SignupPlan | string): string {
    return signupHrefForConfig(registrationEnabled.value, plan)
  }

  const primaryCtaLabel = computed(() => (registrationEnabled.value ? 'Start Free' : 'Contact us'))

  const signupClosedNote = computed(() =>
    registrationEnabled.value
      ? '14-day free trial. No credit card required.'
      : 'New sign-ups are closed for now. Contact us for access.',
  )

  return { registrationEnabled, signupHref, primaryCtaLabel, signupClosedNote }
}

export type { SignupPlan }
