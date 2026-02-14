<template>
  <div class="min-h-screen flex flex-col bg-surface-50">
    <header
      :class="[
        'sticky top-0 z-10 border-b border-surface-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80',
        { 'hidden': !showHeader }
      ]"
    >
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <NuxtLink to="/dashboard" class="flex items-center gap-2 font-semibold text-surface-900">
          <span class="text-primary-600">WRR</span>
          <span class="hidden sm:inline">Web Ranking Reports</span>
        </NuxtLink>
        <nav class="flex items-center gap-4">
          <NuxtLink
            to="/dashboard"
            class="text-sm font-medium text-surface-600 transition hover:text-primary-600"
            active-class="text-primary-600"
          >
            Dashboard
          </NuxtLink>
          <NuxtLink
            v-if="showAdminLink"
            to="/admin/integrations"
            class="text-sm font-medium text-surface-600 transition hover:text-primary-600"
            active-class="text-primary-600"
          >
            Admin
          </NuxtLink>
          <button
            type="button"
            class="text-sm font-medium text-surface-600 transition hover:text-surface-900"
            @click="handleLogout"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { user, logout } = useAuthState()

const showHeader = computed(() => {
  const path = route.path
  return path !== '/auth/login' && path !== '/auth/register'
})

const showAdminLink = computed(() => {
  const email = (user.value?.email as string)?.toLowerCase?.()
  return email === 'admin@vma.agency'
})

function handleLogout() {
  logout()
  navigateTo('/auth/login')
}
</script>
