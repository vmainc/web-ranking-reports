import { getUserIdFromRequest, getUserEmailForUserId } from '~/server/utils/pbServer'

/** Only this account may access /admin/billing (strict; not the broader ADMIN_EMAILS list). */
export const VMA_BILLING_ADMIN_EMAIL = 'admin@vma.agency'

export async function assertVmaBillingAdmin(event: { headers: { get: (n: string) => string | null } }): Promise<{
  userId: string
  email: string
}> {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const email = (await getUserEmailForUserId(event, userId)).toLowerCase().trim()
  if (email !== VMA_BILLING_ADMIN_EMAIL) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  return { userId, email }
}
