export type ProposalEngagementType =
  | 'monthly_marketing'
  | 'website_project'
  | 'website_plus_retainer'
  | 'add_on'

const ENGAGEMENT_SET = new Set<string>([
  'monthly_marketing',
  'website_project',
  'website_plus_retainer',
  'add_on',
])

export function isProposalEngagementType(raw: string): raw is ProposalEngagementType {
  return ENGAGEMENT_SET.has(raw)
}

export const PROPOSAL_ENGAGEMENT_OPTIONS: ReadonlyArray<{ value: ProposalEngagementType; label: string }> = [
  { value: 'monthly_marketing', label: 'Monthly digital marketing package (SEO, ads, reporting)' },
  { value: 'website_project', label: 'Website or one-time build project' },
  { value: 'website_plus_retainer', label: 'Website build + ongoing monthly marketing' },
  { value: 'add_on', label: 'Add-on or standalone service' },
]

const ENGAGEMENT_TITLE_PREFIX: Record<ProposalEngagementType, string> = {
  monthly_marketing: 'Monthly digital marketing',
  website_project: 'Website project',
  website_plus_retainer: 'Website + marketing',
  add_on: 'Add-on services',
}

/** Placeholder title until Claude assist renames the proposal. */
export function defaultProposalTitleForEngagement(
  engagement: ProposalEngagementType,
  client?: { name?: string | null; company?: string | null },
): string {
  const who = client?.company?.trim() || client?.name?.trim() || 'Client'
  return `${ENGAGEMENT_TITLE_PREFIX[engagement]} for ${who}`
}