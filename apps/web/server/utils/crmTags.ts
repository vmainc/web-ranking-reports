import type PocketBase from 'pocketbase'
import { escPbFilterId } from '~/server/utils/workspace'
import { parseContactTags } from '~/utils/crmContactTags'

/** Distinct tag labels used on contacts in this workspace (sorted). */
export async function listCrmContactTags(pb: PocketBase, crmOwnerId: string): Promise<string[]> {
  const rows = await pb.collection('crm_clients').getFullList<{ tags_json?: unknown }>({
    filter: `user = "${escPbFilterId(crmOwnerId)}"`,
    fields: 'tags_json',
  })
  const set = new Set<string>()
  for (const row of rows) {
    for (const t of parseContactTags(row.tags_json)) set.add(t)
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

export function clientHasTag(tags: unknown, tag: string): boolean {
  const want = tag.trim().toLowerCase()
  if (!want) return true
  return parseContactTags(tags).some((x) => x.trim().toLowerCase() === want)
}