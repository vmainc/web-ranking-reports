import { inject } from 'vue'

/** Site analytics dashboard uses vibrant dark UI; child cards/tables/charts read this via inject. */
export function useDashboardVibrant(): boolean {
  return inject<boolean>('dashboardVibrant', false)
}
