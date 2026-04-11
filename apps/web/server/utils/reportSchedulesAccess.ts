import type PocketBase from 'pocketbase'
import { getWorkspaceContext } from '~/server/utils/workspace'

/** PocketBase filter: schedules for sites belonging to this workspace (owner or member). */
export async function pocketbaseFilterReportSchedulesForUser(pb: PocketBase, userId: string): Promise<string> {
  const ctx = await getWorkspaceContext(pb, userId)
  if (ctx.role === 'client') {
    return 'id = "impossible-no-client-schedules"'
  }
  const ownerKey = ctx.role === 'owner' ? userId : ctx.ownerId
  const esc = ownerKey.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `site.user = "${esc}"`
}
