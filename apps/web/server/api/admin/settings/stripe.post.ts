import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'

type StripeKeysValue = {
  test_publishable_key: string
  test_secret_key: string
  live_publishable_key: string
  live_secret_key: string
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const adminEmails = getAdminEmails()
  const pb = getAdminPb()
  await adminAuth(pb)
  const userRecord = await pb.collection('users').getOne<{ email?: string }>(userId)
  const userEmail = userRecord?.email?.toLowerCase?.()
  if (!userEmail || !adminEmails.map((e: string) => e.toLowerCase()).includes(userEmail)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = (await readBody(event).catch(() => ({}))) as Partial<StripeKeysValue>
  const incoming: StripeKeysValue = {
    test_publishable_key: typeof body.test_publishable_key === 'string' ? body.test_publishable_key.trim() : '',
    test_secret_key: typeof body.test_secret_key === 'string' ? body.test_secret_key.trim() : '',
    live_publishable_key: typeof body.live_publishable_key === 'string' ? body.live_publishable_key.trim() : '',
    live_secret_key: typeof body.live_secret_key === 'string' ? body.live_secret_key.trim() : '',
  }

  let existing: StripeKeysValue = {
    test_publishable_key: '',
    test_secret_key: '',
    live_publishable_key: '',
    live_secret_key: '',
  }
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value: Partial<StripeKeysValue> }>('key="stripe_keys"')
    existing = {
      test_publishable_key: row?.value?.test_publishable_key ?? '',
      test_secret_key: row?.value?.test_secret_key ?? '',
      live_publishable_key: row?.value?.live_publishable_key ?? '',
      live_secret_key: row?.value?.live_secret_key ?? '',
    }
  } catch {
    // no existing row
  }

  const value: StripeKeysValue = {
    test_publishable_key: incoming.test_publishable_key || existing.test_publishable_key,
    test_secret_key: incoming.test_secret_key || existing.test_secret_key,
    live_publishable_key: incoming.live_publishable_key || existing.live_publishable_key,
    live_secret_key: incoming.live_secret_key || existing.live_secret_key,
  }

  try {
    const list = await pb.collection('app_settings').getFullList<{ id: string }>({ filter: 'key="stripe_keys"' })
    if (list.length > 0) {
      await pb.collection('app_settings').update(list[0].id, { value })
    } else {
      await pb.collection('app_settings').create({ key: 'stripe_keys', value })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('collection') || msg.includes('404') || msg.includes('not found')) {
      throw createError({
        statusCode: 503,
        message: 'app_settings collection missing. Run: node scripts/create-collections.mjs',
      })
    }
    throw createError({ statusCode: 500, message: msg })
  }

  return { ok: true }
})

