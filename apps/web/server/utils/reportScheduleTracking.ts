import type PocketBase from 'pocketbase'

type FieldCarrier =
  | { schema?: Array<{ name?: string }>; fields?: Array<{ name?: string }> }
  | null
  | undefined

export async function getReportScheduleFieldNames(pb: PocketBase): Promise<Set<string>> {
  const collection = (await pb.collections.getOne('report_schedules').catch(() => null)) as FieldCarrier
  const schema = Array.isArray(collection?.schema)
    ? collection.schema
    : Array.isArray(collection?.fields)
      ? collection.fields
      : []
  return new Set(schema.map((f) => String(f?.name || '')))
}

export function pickSchedulePatch(
  fieldNames: Set<string>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (fieldNames.has(k)) out[k] = v
  }
  return out
}

