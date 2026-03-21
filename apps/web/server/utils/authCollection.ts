import PocketBase from 'pocketbase'

/** Resolve the main PocketBase auth collection (usually `users`). */
export async function getAuthUsersCollection(pb: PocketBase): Promise<{
  id: string
  name?: string
  options?: Record<string, unknown>
} | null> {
  try {
    return await pb.collections.getFirstListItem<{ id: string; name?: string; options?: Record<string, unknown> }>(
      'name="users"',
    )
  } catch {
    try {
      const list = await pb.collections.getFullList<{ id: string; name?: string; options?: Record<string, unknown> }>({
        filter: 'type="auth"',
        batch: 20,
      })
      return list[0] ?? null
    } catch {
      return null
    }
  }
}
