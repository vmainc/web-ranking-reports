import type PocketBase from 'pocketbase'
import { extractPocketBaseRelationId } from '~/server/utils/workspace'

export const PROPOSAL_SETTINGS_KEY_PREFIX = 'proposal_settings'

export function proposalSettingsKeyForOwner(ownerId: string): string {
  return `${PROPOSAL_SETTINGS_KEY_PREFIX}:${ownerId}`
}

import {
  defaultProposalBrand,
  defaultProposalContent,
  type ProposalBrandSnapshot,
  type ProposalContentJson,
} from '~/utils/proposalContent'

export type ProposalBrandSettings = ProposalBrandSnapshot & {
  default_terms?: string
}

export type ProposalSettings = {
  catalog_site_id: string | null
  brand: ProposalBrandSettings
}

function normalizeBrand(raw: unknown): ProposalBrandSettings {
  const defaults = defaultProposalBrand()
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const gradient = Array.isArray(o.gradient)
    ? o.gradient.map((c) => String(c)).filter(Boolean).slice(0, 6)
    : defaults.gradient
  return {
    mission: typeof o.mission === 'string' ? o.mission : defaults.mission,
    vision: typeof o.vision === 'string' ? o.vision : defaults.vision,
    closing_statement:
      typeof o.closing_statement === 'string' ? o.closing_statement : defaults.closing_statement,
    gradient: gradient?.length ? gradient : [...(defaults.gradient || [])],
    default_terms: typeof o.default_terms === 'string' ? o.default_terms : '',
  }
}

export async function getProposalSettings(pb: PocketBase, ownerId: string): Promise<ProposalSettings> {
  const key = proposalSettingsKeyForOwner(ownerId)
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{
      value?: { catalog_site_id?: string; brand?: unknown }
    }>(`key="${key.replace(/"/g, '\\"')}"`)
    const id = typeof row?.value?.catalog_site_id === 'string' ? row.value.catalog_site_id.trim() : ''
    return {
      catalog_site_id: id || null,
      brand: normalizeBrand(row?.value?.brand),
    }
  } catch {
    return { catalog_site_id: null, brand: normalizeBrand(null) }
  }
}

export async function saveProposalSettings(
  pb: PocketBase,
  ownerId: string,
  settings: Partial<ProposalSettings>,
): Promise<ProposalSettings> {
  const key = proposalSettingsKeyForOwner(ownerId)
  const current = await getProposalSettings(pb, ownerId)
  const value = {
    catalog_site_id:
      settings.catalog_site_id !== undefined ? settings.catalog_site_id || null : current.catalog_site_id,
    brand: settings.brand !== undefined ? normalizeBrand(settings.brand) : current.brand,
  }
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ id: string }>(
      `key="${key.replace(/"/g, '\\"')}"`,
    )
    await pb.collection('app_settings').update(row.id, { value })
  } catch {
    await pb.collection('app_settings').create({ key, value })
  }
  return value
}

/** Initial structured content for a new proposal (client + workspace brand defaults). */
export function buildInitialProposalContent(opts: {
  title: string
  validUntil?: string | null
  client?: Partial<ProposalContentJson['client']>
  brand?: ProposalBrandSettings
  templateContent?: ProposalContentJson | null
}): ProposalContentJson {
  const brand = opts.brand || normalizeBrand(null)
  const tpl = opts.templateContent
  const content = defaultProposalContent({
    schema_version: 1,
    sections: tpl?.sections?.length ? tpl.sections : undefined,
    pricing: tpl?.pricing,
    show_closing: tpl?.show_closing,
    brand: { ...brand, ...(tpl?.brand || {}) },
    client: {
      ...(tpl?.client || {}),
      ...opts.client,
      project_title: opts.client?.project_title || tpl?.client?.project_title || opts.title,
      expiration_date:
        opts.validUntil?.slice(0, 10) ||
        opts.client?.expiration_date ||
        tpl?.client?.expiration_date ||
        '',
    },
  })
  if (brand.default_terms) {
    const terms = content.sections.find((s) => s.key === 'terms_assumptions')
    if (terms && !terms.body.trim()) terms.body = brand.default_terms
  }
  return content
}

export async function assertCatalogSiteOwned(
  pb: PocketBase,
  ownerId: string,
  siteId: string,
) {
  const site = await pb.collection('sites').getOne(siteId).catch(() => null)
  if (!site || extractPocketBaseRelationId((site as { user?: unknown }).user) !== ownerId) {
    throw createError({ statusCode: 403, message: 'Catalog site not found' })
  }
  return site
}

/** Strip HTML from Woo descriptions for frozen line items / catalog cache. */
export function stripHtml(html: string | undefined | null, max = 2000): string {
  if (!html) return ''
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return text.slice(0, max)
}

export function parseWooPrice(value: string | undefined | null): number {
  if (value == null || value === '') return 0
  const n = Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}
