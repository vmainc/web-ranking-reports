export function isMissingCloudflareCollectionError(err: unknown): boolean {
  const msg =
    err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message
      : String(err ?? '')
  return /requested resource wasn't found|collection.*not found|404/i.test(msg)
}

export function cloudflareSetupError(): ReturnType<typeof createError> {
  return createError({
    statusCode: 503,
    message:
      'Cloudflare setup is incomplete in PocketBase. Run: node scripts/add-cloudflare-collections.mjs and node scripts/add-cloudflare-provider.mjs (or follow docs/DEPLOY_LIVE.md Cloudflare setup), then retry.',
  })
}

