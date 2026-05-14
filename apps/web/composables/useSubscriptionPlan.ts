import { computed, ref } from 'vue'
import { getFreeTierSiteHomeOrSitesListPath } from '~/composables/freeWorkspaceHome'

export type WorkspaceSubscriptionPlan = 'free' | 'starter' | 'growth' | 'agency' | 'comped'

export function useSubscriptionPlan() {
  const pb = usePocketbase()
  const plan = useState<WorkspaceSubscriptionPlan | null>('wrr-subscription-plan', () => null)
  /** For free owners: `/sites/{id}` when they have a site, else `/sites`. Cleared when paid. */
  const freeOwnerHomePath = useState<string | null>('wrr-free-owner-home', () => null)
  const loading = ref(false)

  function resetSubscriptionPlan() {
    plan.value = null
    freeOwnerHomePath.value = null
  }

  async function refreshFreeOwnerHome() {
    if (plan.value !== 'free') {
      freeOwnerHomePath.value = null
      return
    }
    freeOwnerHomePath.value = await getFreeTierSiteHomeOrSitesListPath()
  }

  /** Call after loading `/api/subscriptions/status` so nav updates without a full refetch. */
  function syncPlanFromStatus(planRaw: string | undefined) {
    const p = String(planRaw || '').toLowerCase().trim()
    if (p === 'starter' || p === 'growth' || p === 'agency' || p === 'comped') {
      plan.value = p
      freeOwnerHomePath.value = null
      return
    }
    plan.value = 'free'
  }

  async function refreshPlan() {
    const token = String(pb.authStore.token || '').trim()
    if (!token) {
      plan.value = null
      freeOwnerHomePath.value = null
      return
    }
    loading.value = true
    try {
      const st = await $fetch<{ plan?: string }>('/api/subscriptions/status', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-WRR-Authorization': `Bearer ${token}`,
        },
      })
      syncPlanFromStatus(st?.plan)
      await refreshFreeOwnerHome()
    } catch {
      plan.value = null
      freeOwnerHomePath.value = null
    } finally {
      loading.value = false
    }
  }

  /** After load: hide Dashboard / Email / Agency until we know the user is not on the free tier. */
  const showPaidWorkspaceNav = computed(() => plan.value !== null && plan.value !== 'free')

  return {
    plan,
    freeOwnerHomePath,
    loading,
    refreshPlan,
    refreshFreeOwnerHome,
    resetSubscriptionPlan,
    syncPlanFromStatus,
    showPaidWorkspaceNav,
  }
}
