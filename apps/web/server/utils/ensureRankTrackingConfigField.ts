import type PocketBase from 'pocketbase'

const FIELD_NAME = 'rank_tracking_config'

type CollectionSchema = {
  id: string
  schema?: Array<{ name?: string }>
  fields?: Array<{ name?: string }>
}

/**
 * Production PocketBase may predate the rank-tracking location field.
 * Unknown JSON keys are dropped on update, so location "saves" then reverts to US.
 */
export async function ensureSitesRankTrackingConfigField(pb: PocketBase): Promise<void> {
  const col = (await pb.collections.getOne('sites')) as CollectionSchema
  const raw = Array.isArray(col.schema) ? col.schema : Array.isArray(col.fields) ? col.fields : []
  const fields = [...raw]
  if (fields.some((f) => f && f.name === FIELD_NAME)) return

  fields.push({
    name: FIELD_NAME,
    type: 'json',
    required: false,
    options: { maxSize: 200000 },
  } as { name: string })

  const payload: Record<string, unknown> = { schema: fields }
  if (Array.isArray(col.fields)) payload.fields = fields
  await pb.collections.update(col.id, payload)
}
