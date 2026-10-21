/** Detect PocketBase missing-collection / not-found style errors. */
export function isMissingCollectionError(e: unknown): boolean {
  const err = e as { status?: number; message?: string; response?: { message?: string; data?: { message?: string } } }
  const msg = err?.response?.message || err?.response?.data?.message || err?.message || ''
  return err?.status === 404 || /missing collection|wasn't found|not found/i.test(msg)
}

/** Map PocketBase "missing collection" errors to a clear 503 for deploy/bootstrap. */
export function rethrowIfMissingCollection(e: unknown, collectionName: string, bootstrapHint?: string): never {
  if (isMissingCollectionError(e)) {
    throw createError({
      statusCode: 503,
      message:
        bootstrapHint ||
        `PocketBase collection "${collectionName}" is not set up yet. On the VPS run: ./infra/run-proposal-collections.sh`,
    })
  }
  throw e
}
