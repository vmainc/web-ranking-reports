<template>
  <div v-if="user" class="relative">
    <button
      type="button"
      class="flex items-center gap-2 rounded-full border border-surface-200 bg-white px-2 py-1 text-sm font-medium text-surface-700 shadow-sm hover:bg-surface-50"
      @click="open = !open"
    >
      <span
        class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white"
      >
        {{ initials }}
      </span>
      <span class="hidden sm:inline max-w-[120px] truncate">{{ email }}</span>
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
      </div>

      <div class="px-4 py-3 space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-surface-400">
          Agency
        </p>
        <p class="text-sm text-surface-600">
          Set your agency name and logo once; they’ll be used across reports.
        </p>
        <NuxtLink
          to="/admin/integrations"
          class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-500"
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
</template>

<script setup lang="ts">
const { user, logout } = useAuthState()

const open = ref(false)

const email = computed(() => {
  const u = user.value as { email?: string } | null
  return u?.email ?? ''
})

const displayName = computed(() => {
  const u = user.value as { name?: string; email?: string } | null
  return u?.name ?? ''
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

