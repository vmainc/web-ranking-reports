import type { CrmContactPoint } from '~/types'

const LABELS: Record<CrmContactPoint['kind'], string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Note',
  report_sent: 'Report sent',
  proposal_created: 'Proposal created',
  proposal_sent: 'Proposal sent',
  proposal_viewed: 'Proposal viewed',
  proposal_accepted: 'Proposal accepted',
  proposal_declined: 'Proposal declined',
  proposal_superseded: 'Proposal superseded',
}

export function crmContactKindLabel(kind: CrmContactPoint['kind'] | string): string {
  if (kind in LABELS) return LABELS[kind as CrmContactPoint['kind']]
  return String(kind).replace(/_/g, ' ')
}
