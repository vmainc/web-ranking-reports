import type { PocketBase } from 'pocketbase'
import type { Site, SiteRecord } from '~/types'

export async function listSites(pb: PocketBase): Promise<{
  sites: SiteRecord[]
  role: 'owner' | 'member' | 'client'
}> {
  const token = pb.authStore.token
  if (!token) return { sites: [], role: 'owner' }
  try {
    const res = await $fetch<{ sites: SiteRecord[]; role?: 'owner' | 'member' | 'client' }>('/api/workspace/sites', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return { sites: res.sites ?? [], role: res.role ?? 'owner' }
  } catch {
    return { sites: [], role: 'owner' }
  }
}

export async function getSite(pb: PocketBase, id: string): Promise<SiteRecord | null> {
  const token = pb.authStore.token
  if (!token) return null
  try {
    const res = await $fetch<{ site: SiteRecord; canWrite?: boolean }>(`/api/workspace/sites/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const s = res.site as SiteRecord
    if (typeof res.canWrite === 'boolean') {
      s.canWrite = res.canWrite
    }
    return s
  } catch {
    return null
  }
}

export async function createSite(
  pb: PocketBase,
  data: Pick<Site, 'name' | 'domain'>
): Promise<SiteRecord> {
  const token = pb.authStore.token
  if (!token) throw new Error('Not authenticated')
  const res = await $fetch<{ site: SiteRecord }>('/api/workspace/sites', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: { name: data.name, domain: data.domain },
  })
  return res.site
}

export async function updateSite(
  pb: PocketBase,
  id: string,
  data: Partial<Pick<Site, 'name' | 'domain'>>
): Promise<SiteRecord> {
  return await pb.collection('sites').update<SiteRecord>(id, data)
}

/** Update site logo (requires sites collection to have an optional "logo" file field). */
export async function updateSiteLogo(
  pb: PocketBase,
  id: string,
  file: File
): Promise<SiteRecord> {
  const formData = new FormData()
  formData.append('logo', file)
  return await pb.collection('sites').update<SiteRecord>(id, formData)
}

export async function deleteSite(pb: PocketBase, id: string): Promise<void> {
  await pb.collection('sites').delete(id)
}
