import type PocketBase from 'pocketbase'
import type { ProposalServicePackage, ProposalTemplateSettings } from '~/types'
import {
  VMA_DEFAULT_PROPOSAL_TEMPLATE,
  VMA_SERVICE_PACKAGE_SEEDS,
  type VmaPackageSeed,
} from '~/server/data/vmaServicePackages'

export const PROPOSAL_TEMPLATE_KEY_PREFIX = 'proposal_template'

export function proposalTemplateKeyForOwner(ownerId: string): string {
  return `${PROPOSAL_TEMPLATE_KEY_PREFIX}:${ownerId}`
}

export async function getProposalTemplate(
  pb: PocketBase,
  ownerId: string,
): Promise<ProposalTemplateSettings> {
  const key = proposalTemplateKeyForOwner(ownerId)
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: ProposalTemplateSettings }>(
      `key="${key.replace(/"/g, '\\"')}"`,
    )
    const v = row?.value || {}
    return {
      intro_html: v.intro_html ?? VMA_DEFAULT_PROPOSAL_TEMPLATE.intro_html,
      terms_html: v.terms_html ?? VMA_DEFAULT_PROPOSAL_TEMPLATE.terms_html,
      currency: (v.currency || VMA_DEFAULT_PROPOSAL_TEMPLATE.currency).toUpperCase(),
    }
  } catch {
    return { ...VMA_DEFAULT_PROPOSAL_TEMPLATE, currency: VMA_DEFAULT_PROPOSAL_TEMPLATE.currency }
  }
}

export async function saveProposalTemplate(
  pb: PocketBase,
  ownerId: string,
  template: ProposalTemplateSettings,
): Promise<ProposalTemplateSettings> {
  const key = proposalTemplateKeyForOwner(ownerId)
  const value: ProposalTemplateSettings = {
    intro_html: template.intro_html?.trim() || null,
    terms_html: template.terms_html?.trim() || null,
    currency: (template.currency || 'USD').toUpperCase(),
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

export async function listServicePackages(
  pb: PocketBase,
  ownerId: string,
  opts?: { activeOnly?: boolean },
): Promise<ProposalServicePackage[]> {
  let filter = `user = "${ownerId.replace(/"/g, '\\"')}"`
  if (opts?.activeOnly) {
    filter += ' && active = true'
  }
  return await pb.collection('proposal_service_packages').getFullList<ProposalServicePackage>({
    filter,
    sort: 'sort_order,name',
  })
}

export function packageToProposalItemInput(pkg: ProposalServicePackage) {
  const catalogDefault = Number(pkg.default_unit_price) || 0
  return {
    source: 'package' as const,
    sku: pkg.sku,
    name: pkg.name,
    description: pkg.description_html,
    qty: 1,
    unit_price: catalogDefault,
    billing_interval: pkg.billing_interval,
    metadata_json: {
      service_package_id: pkg.id,
      package_sku: pkg.sku,
      catalog_default_unit_price: catalogDefault,
    },
  }
}

export async function upsertServicePackageBySku(
  pb: PocketBase,
  ownerId: string,
  seed: VmaPackageSeed,
): Promise<'created' | 'updated' | 'unchanged'> {
  const esc = ownerId.replace(/"/g, '\\"')
  const skuEsc = seed.sku.replace(/"/g, '\\"')
  const existing = await pb
    .collection('proposal_service_packages')
    .getFirstListItem<ProposalServicePackage>(`user = "${esc}" && sku = "${skuEsc}"`)
    .catch(() => null)

  const payload = {
    user: ownerId,
    sku: seed.sku,
    name: seed.name,
    description_html: seed.description_html,
    default_unit_price: seed.default_unit_price,
    billing_interval: seed.billing_interval,
    category: seed.category,
    sort_order: seed.sort_order,
    active: true,
  }

  if (!existing) {
    await pb.collection('proposal_service_packages').create(payload)
    return 'created'
  }

  await pb.collection('proposal_service_packages').update(existing.id, {
    name: payload.name,
    description_html: payload.description_html,
    default_unit_price: payload.default_unit_price,
    billing_interval: payload.billing_interval,
    category: payload.category,
    sort_order: payload.sort_order,
    active: true,
  })
  return 'updated'
}

export async function seedVmaServicePackages(pb: PocketBase, ownerId: string) {
  await saveProposalTemplate(pb, ownerId, VMA_DEFAULT_PROPOSAL_TEMPLATE)
  let created = 0
  let updated = 0
  for (const seed of VMA_SERVICE_PACKAGE_SEEDS) {
    const r = await upsertServicePackageBySku(pb, ownerId, seed)
    if (r === 'created') created += 1
    else if (r === 'updated') updated += 1
  }
  return { created, updated, total: VMA_SERVICE_PACKAGE_SEEDS.length }
}