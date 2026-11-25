import type { ProposalStatus } from '~/types'

const DELETABLE: ProposalStatus[] = ['draft', 'sent', 'viewed', 'declined', 'superseded']

export function canDeleteProposal(status: string | undefined): boolean {
  return DELETABLE.includes(status as ProposalStatus)
}

export function deleteProposalConfirmMessage(title: string, status: string | undefined): string {
  const name = title.trim() || 'this proposal'
  if (status === 'draft' || status === 'declined' || status === 'superseded') {
    return `Delete “${name}”? This cannot be undone.`
  }
  if (status === 'sent' || status === 'viewed') {
    return `Delete “${name}”? The public link will stop working. This cannot be undone.`
  }
  return `Delete “${name}”?`
}