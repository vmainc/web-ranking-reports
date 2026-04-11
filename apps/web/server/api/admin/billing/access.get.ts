import { getUserIdFromRequest, getUserEmailForUserId } from '~/server/utils/pbServer'
import { VMA_BILLING_ADMIN_EMAIL } from '~/server/utils/vmaBillingAdmin'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) {
    return { allowed: false, hint: 'Not signed in.' }
  }
  const email = (await getUserEmailForUserId(event, userId)).toLowerCase().trim()
  const allowed = email === VMA_BILLING_ADMIN_EMAIL
  return {
    allowed,
    hint: !allowed && email ? 'Only admin@vma.agency can open Billing Admin.' : undefined,
  }
})
