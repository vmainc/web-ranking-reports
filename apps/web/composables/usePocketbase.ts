import PocketBase from 'pocketbase'
import { computed, type ComputedRef, type Ref } from 'vue'

let browserPb: PocketBase | null = null

export function usePocketbase(): PocketBase {
  const config = useRuntimeConfig()
  const raw = (config.public.pocketbaseUrl as string) || ''
  const url = raw.replace(/\/+$/, '') || 'http://127.0.0.1:8090'
  // Keep a single PB client on the browser so authStore stays consistent
  // across composables/components.
  if (import.meta.client) {
    if (!browserPb) browserPb = new PocketBase(url)
    return browserPb
  }
  // On server, always create a fresh instance per call/request context.
  return new PocketBase(url)
}

let authChangeBound = false

/** Reactive auth state: current user or null. Call initAuth() in app to sync. */
export function useAuthState(): {
  user: Ref<Record<string, unknown> | null>
  isClientUser: ComputedRef<boolean>
  initAuth: () => void
  logout: () => void
} {
  const user = useState<Record<string, unknown> | null>('pb-user', () => null)
  const pb = usePocketbase()

  const isClientUser = computed(() => {
    const u = user.value
    return String(u?.account_type ?? '').toLowerCase().trim() === 'client'
  })

  function initAuth() {
    user.value = pb.authStore.model as Record<string, unknown> | null
    if (authChangeBound) return
    authChangeBound = true
    pb.authStore.onChange(() => {
      user.value = pb.authStore.model as Record<string, unknown> | null
    })
  }

  function logout() {
    pb.authStore.clear()
    user.value = null
  }

  return { user, isClientUser, initAuth, logout }
}
