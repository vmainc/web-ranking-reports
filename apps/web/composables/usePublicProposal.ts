import type { PublicProposalDto } from '~/components/crm/ProposalPublicView.vue'

export function usePublicProposal(token: Ref<string>) {
  return useAsyncData(
    () => `public-proposal-${token.value.trim()}`,
    async () => {
      const t = token.value.trim()
      if (!t) return null
      const data = await $fetch<{ proposal: PublicProposalDto }>(`/api/proposals/public/${t}`)
      return data.proposal
    },
    { watch: [token] },
  )
}