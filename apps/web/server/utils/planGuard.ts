import type PocketBase from 'pocketbase'
import type { LimitType } from '~/server/services/subscriptions'
import { checkLimit } from '~/server/services/subscriptions'

export async function assertPlanLimit(
  pb: PocketBase,
  userId: string,
  type: LimitType,
  incrementBy = 1,
): Promise<void> {
  const res = await checkLimit(pb, userId, type, incrementBy)
  if (res.allowed) return
  const fullMessage = [res.message, res.upgradeCta].filter(Boolean).join(' ')
  throw createError({
    statusCode: 402,
    message: fullMessage || 'Plan limit reached.',
    data: {
      code: 'PLAN_LIMIT_REACHED',
      type,
      plan: res.plan,
      used: res.used,
      max: res.max,
      upgradeCta: res.upgradeCta || 'Upgrade your plan.',
    },
  })
}

