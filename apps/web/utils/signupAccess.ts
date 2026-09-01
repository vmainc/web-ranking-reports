export type SignupPlan = 'starter' | 'growth' | 'agency'

export function signupHrefForConfig(enabled: boolean, plan?: SignupPlan | string): string {
  if (enabled) {
    const p = String(plan ?? '').toLowerCase().trim()
    if (p === 'starter' || p === 'growth' || p === 'agency') return `/auth/register?plan=${p}`
    return '/auth/register'
  }
  const p = String(plan ?? '').toLowerCase().trim()
  if (p === 'starter' || p === 'growth' || p === 'agency') return `/contact?plan=${p}`
  return '/contact'
}
