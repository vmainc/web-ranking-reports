import type PocketBase from 'pocketbase'
import { createError } from 'h3'
import { CRM_PIPELINE_STAGES, CRM_STAGE_THEMES } from '~/utils/crmPipelineStage'
import { escPbFilterId } from '~/server/utils/workspace'

export type CrmPipelineStageRow = {
  id: string
  user: string
  key: string
  label: string
  sort_order: number
  is_default?: boolean
}

export const DEFAULT_PIPELINE_STAGES = CRM_PIPELINE_STAGES.map((key, index) => ({
  key,
  label: CRM_STAGE_THEMES[key].label,
  sort_order: index,
  is_default: true,
}))

export function slugifyPipelineKey(label: string): string {
  const base = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  return base || `stage_${Date.now().toString(36)}`
}

export async function listPipelineStages(
  pb: PocketBase,
  ownerId: string,
): Promise<CrmPipelineStageRow[]> {
  try {
    return await pb.collection('crm_pipeline_stages').getFullList<CrmPipelineStageRow>({
      filter: `user = "${escPbFilterId(ownerId)}"`,
      sort: 'sort_order,created',
      batch: 200,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/missing collection|wasn't found|404/i.test(msg)) {
      throw createError({
        statusCode: 503,
        message:
          'CRM Sales pipeline stages are not set up yet. Run: ./infra/run-crm-pipeline-stages.sh',
      })
    }
    throw e
  }
}

export async function ensureDefaultPipelineStages(
  pb: PocketBase,
  ownerId: string,
): Promise<CrmPipelineStageRow[]> {
  let rows = await listPipelineStages(pb, ownerId)
  if (rows.length) return rows

  for (const stage of DEFAULT_PIPELINE_STAGES) {
    await pb.collection('crm_pipeline_stages').create({
      user: ownerId,
      key: stage.key,
      label: stage.label,
      sort_order: stage.sort_order,
      is_default: true,
    })
  }
  rows = await listPipelineStages(pb, ownerId)
  return rows
}

export async function assertValidPipelineStageKey(
  pb: PocketBase,
  ownerId: string,
  key: string,
): Promise<string> {
  const k = String(key || '').trim()
  if (!k) {
    throw createError({ statusCode: 400, message: 'pipeline_stage is required' })
  }
  const stages = await ensureDefaultPipelineStages(pb, ownerId)
  if (!stages.some((s) => s.key === k)) {
    throw createError({ statusCode: 400, message: `Unknown pipeline stage: ${k}` })
  }
  return k
}

export function publicPipelineStage(row: CrmPipelineStageRow) {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    sortOrder: row.sort_order ?? 0,
    isDefault: Boolean(row.is_default),
  }
}
