/** WooCommerce → proposal_products sync is retired; service packages are the catalog. */
export function assertProposalWooLegacyEnabled(): void {
  if (process.env.PROPOSAL_WOO_LEGACY_ENABLED === 'true') return
  throw createError({
    statusCode: 410,
    message:
      'WooCommerce proposal catalog is disabled. Manage packages under CRM → Proposals → Packages & template.',
  })
}