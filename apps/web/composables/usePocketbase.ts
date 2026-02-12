import PocketBase from 'pocketbase'
import type { Ref } from 'vue'

export function usePocketbase(): PocketBase {
  const config = useRuntimeConfig()
  const raw = (config.public.pocketbaseUrl as string) || ''
  const url = raw.replace(/\/+$/, '') || 'http://127.0.0.1:8090'

  const pb = new PocketBase(url)
  return pb
}

/** Reactive auth state: current user or null. Call initAuth() in app to sync. */
export function useAuthState(): {
  user: Ref<Record<string, unknown> | null>
  initAuth: () => void
  logout: () => void
} {
  const user = useState<Record<string, unknown> | null>('pb-user', () => null)
  const pb = usePocketbase()

  function initAuth() {
    user.value = pb.authStore.model as Record<string, unknown> | null
    pb.authStore.onChange(() => {
      user.value = pb.authStore.model as Record<string, unknown> | null
    })
  }

  function logout() {
    pb.authStore.clear()
    user.value = null
  }

  return { user, initAuth, logout }
}
