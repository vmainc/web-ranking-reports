import type PocketBase from 'pocketbase'
import type { CrmClient } from '~/types'

export type RecipientResolutionMode = 'all' | 'site' | 'tag'

/**
 * CRM contacts for this user that have a usable email, optionally filtered by site or tag.
 */
export async function resolveCampaignRecipients(
  pb: PocketBase,
  userId: string,
  opts: { mode: RecipientResolutionMode; siteId?: string; tag?: string },
): Promise<CrmClient[]> {
  let filter = `user = "${userId}" && email != null && email != ""`
  if (opts.mode === 'site' && opts.siteId) {
    filter += ` && site = "${opts.siteId}"`
  }

  const rows = await pb.collection('crm_clients').getFullList<CrmClient>({ filter, batch: 500 })

  if (opts.mode === 'tag' && opts.tag?.trim()) {
    const t = opts.tag.trim().toLowerCase()
    return rows.filter((c) => Array.isArray(c.tags_json) && c.tags_json.some((x) => String(x).toLowerCase() === t))
  }

  return rows
}

/** One row per unique email (first contact wins). */
export function dedupeRecipientsByEmail(contacts: CrmClient[]): CrmClient[] {
  const seen = new Set<string>()
  const out: CrmClient[] = []
  for (const c of contacts) {
    const em = (c.email ?? '').trim().toLowerCase()
    if (!em || seen.has(em)) continue
    seen.add(em)
    out.push(c)
  }
  return out
}
