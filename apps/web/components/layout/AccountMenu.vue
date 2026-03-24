<template>
  <!-- Auth exists only in the browser; SSR would render empty and the client would render the menu → hydration mismatch. -->
  <ClientOnly>
    <div v-if="user" class="relative" data-account-menu-root>
    <button
      type="button"
      class="flex items-center gap-2 rounded-full border border-surface-200 bg-white px-2 py-1 text-sm font-medium text-surface-700 shadow-sm hover:bg-surface-50"
      @click="open = !open"
    >
      <span class="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-xs font-semibold text-white">
        <img v-if="avatarUrl" :src="avatarUrl" alt="Profile image" class="h-full w-full object-cover" />
        <span v-else>{{ initials }}</span>
      </span>
      <span class="hidden sm:inline max-w-[120px] truncate">{{ headerLabel }}</span>
      <svg
        class="h-4 w-4 text-surface-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute right-0 mt-2 w-64 rounded-xl border border-surface-200 bg-white shadow-lg ring-1 ring-black/5"
    >
      <div class="border-b border-surface-100 px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-surface-400">Account</p>
        <p class="mt-1 text-sm font-medium text-surface-900">
          {{ displayName || email || 'Signed in' }}
        </p>
        <p v-if="email" class="mt-0.5 truncate text-xs text-surface-500">
          {{ email }}
        </p>
        <NuxtLink
          to="/account"
          class="mt-2 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
          @click="open = false"
        >
          Account settings →
        </NuxtLink>
      </div>

      <div v-if="isAdminEmail" class="px-4 py-3 space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-surface-400">
          Agency
        </p>
        <p class="text-sm text-surface-600">
          Set your agency name and logo once; they’ll be used across reports.
        </p>
        <NuxtLink
          to="/account"
          class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-500"
          @click="open = false"
        >
          Agency name & logo
        </NuxtLink>
      </div>

      <div class="border-t border-surface-100 px-4 py-2">
        <button
          type="button"
          class="w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium text-surface-600 hover:bg-surface-50"
          @click="handleLogout"
        >
          Log out
        </button>
      </div>
    </div>
  </div>
    <template #fallback>
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-surface-200 bg-surface-100"
        aria-hidden="true"
      />
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
const { user, logout } = useAuthState()

const open = ref(false)

const email = computed(() => {
  const u = user.value as { email?: string } | null
  return u?.email ?? ''
})

const displayName = computed(() => {
  const u = user.value as { name?: string; first_name?: string; last_name?: string; email?: string } | null
  const first = (u?.first_name ?? '').trim()
  const last = (u?.last_name ?? '').trim()
  const full = [first, last].filter(Boolean).join(' ')
  return full || u?.name || ''
})

const headerLabel = computed(() => displayName.value || email.value || 'Account')

const avatarUrl = computed(() => {
  const pb = usePocketbase()
  const u = user.value as Record<string, unknown> | null
  const avatar = (u?.avatar as string | undefined) ?? ''
  if (!u || !avatar) return ''
  return pb.files.getUrl(u, avatar)
})

const isAdminEmail = computed(() => {
  const e = email.value?.toLowerCase?.().trim()
  return e === 'admin@vma.agency'
})

const initials = computed(() => {
  if (displayName.value) {
    return displayName.value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
  }
  if (email.value) {
    return email.value.slice(0, 2).toUpperCase()
  }
  return 'WW'
})

function handleLogout() {
  logout()
  navigateTo('/auth/login')
}

onMounted(() => {
  if (typeof window === 'undefined') return
  window.addEventListener('click', onWindowClick)
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('click', onWindowClick)
})

function onWindowClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return
  const menuEl = (document.querySelector('[data-account-menu-root]') as HTMLElement | null) ?? null
  if (!menuEl) return
  if (!menuEl.contains(target)) open.value = false
}
</script>

