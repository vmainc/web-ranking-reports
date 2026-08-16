import type PocketBase from 'pocketbase'

export const FACEBOOK_SYNC_LOCK_KEY = 'social_facebook_sync_lock'
export const FACEBOOK_SYNC_LOCK_STALE_MS = 45 * 60 * 1000

export type FacebookSyncLockValue = {
  owner: string
  startedAt: string
}

export type FacebookSyncLockDecision = {
  action: 'acquire' | 'skip' | 'steal'
  reason: string
}

let inProcessOwner: string | null = null

export function evaluateFacebookSyncLock(opts: {
  existing: FacebookSyncLockValue | null
  nowMs: number
  owner: string
  staleMs?: number
}): FacebookSyncLockDecision {
  const staleMs = opts.staleMs ?? FACEBOOK_SYNC_LOCK_STALE_MS
  const existing = opts.existing
  if (!existing?.owner || !existing.startedAt) {
    return { action: 'acquire', reason: 'empty' }
  }
  const started = Date.parse(existing.startedAt)
  if (!Number.isFinite(started) || opts.nowMs - started >= staleMs) {
    return { action: 'steal', reason: 'stale' }
  }
  if (existing.owner === opts.owner) {
    return { action: 'acquire', reason: 'same_owner' }
  }
  return { action: 'skip', reason: 'held' }
}

export function tryAcquireInProcessFacebookSyncLock(owner: string): boolean {
  if (inProcessOwner && inProcessOwner !== owner) return false
  inProcessOwner = owner
  return true
}

export function releaseInProcessFacebookSyncLock(owner?: string): void {
  if (owner && inProcessOwner && inProcessOwner !== owner) return
  inProcessOwner = null
}

export function resetInProcessFacebookSyncLockForTests(): void {
  inProcessOwner = null
}

function asLockValue(raw: unknown): FacebookSyncLockValue | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as FacebookSyncLockValue
  if (typeof v.owner !== 'string' || typeof v.startedAt !== 'string') return null
  return { owner: v.owner, startedAt: v.startedAt }
}

async function readLockRow(pb: PocketBase): Promise<{ id: string; value: FacebookSyncLockValue | null } | null> {
  try {
    const list = await pb.collection('app_settings').getFullList<{ id: string; value?: unknown }>({
      filter: `key="${FACEBOOK_SYNC_LOCK_KEY}"`,
    })
    if (!list[0]) return null
    return { id: list[0].id, value: asLockValue(list[0].value) }
  } catch {
    return null
  }
}

export async function acquireFacebookSyncLock(
  pb: PocketBase,
  owner: string,
  now = new Date(),
): Promise<{ acquired: boolean; reason: string }> {
  const nowMs = now.getTime()
  const payload: FacebookSyncLockValue = { owner, startedAt: now.toISOString() }

  try {
    const row = await readLockRow(pb)
    const decision = evaluateFacebookSyncLock({
      existing: row?.value || null,
      nowMs,
      owner,
    })
    if (decision.action === 'skip') {
      return { acquired: false, reason: decision.reason }
    }
    if (row) {
      await pb.collection('app_settings').update(row.id, { value: payload })
      return { acquired: true, reason: decision.reason }
    }
    try {
      await pb.collection('app_settings').create({ key: FACEBOOK_SYNC_LOCK_KEY, value: payload })
      return { acquired: true, reason: 'created' }
    } catch {
      const raced = await readLockRow(pb)
      const again = evaluateFacebookSyncLock({
        existing: raced?.value || null,
        nowMs,
        owner,
      })
      if (again.action === 'skip') return { acquired: false, reason: 'raced' }
      if (raced && again.action === 'steal') {
        await pb.collection('app_settings').update(raced.id, { value: payload })
        return { acquired: true, reason: 'steal' }
      }
      return { acquired: false, reason: 'raced' }
    }
  } catch {
    // Single-process deployments can still rely on the in-process lock.
    return { acquired: true, reason: 'app_settings_unavailable' }
  }
}

export async function releaseFacebookSyncLock(pb: PocketBase, owner: string): Promise<void> {
  try {
    const row = await readLockRow(pb)
    if (!row?.value?.owner) return
    if (row.value.owner !== owner) return
    await pb.collection('app_settings').update(row.id, { value: { owner: '', startedAt: '' } })
  } catch {
    // ignore
  }
}
