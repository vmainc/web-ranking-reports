import type { PocketBase } from 'pocketbase'
import type { Site, SiteRecord } from '~/types'

export async function listSites(pb: PocketBase): Promise<SiteRecord[]> {
  const records = await pb.collection('sites').getFullList<SiteRecord>({
    filter: `user = "${pb.authStore.model?.id}"`,
    sort: '-created',
  })
  return records
}

export async function getSite(pb: PocketBase, id: string): Promise<SiteRecord | null> {
  try {
    const record = await pb.collection('sites').getOne<SiteRecord>(id)
    return record
  } catch {
    return null
  }
}

export async function createSite(
  pb: PocketBase,
  data: Pick<Site, 'name' | 'domain'>
): Promise<SiteRecord> {
  const userId = pb.authStore.model?.id
  if (!userId) throw new Error('Not authenticated')
  return await pb.collection('sites').create<SiteRecord>({
    user: userId,
    name: data.name,
    domain: data.domain,
  })
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
