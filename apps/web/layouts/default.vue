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
            to="/sites"
            class="text-sm font-medium text-surface-600 transition hover:text-primary-600"
            active-class="text-primary-600"
          >
            Sites
          </NuxtLink>
          <NuxtLink
            to="/reports"
            class="text-sm font-medium text-surface-600 transition hover:text-primary-600"
            active-class="text-primary-600"
          >
            Reports
          </NuxtLink>
          <NuxtLink
            to="/crm"
            class="text-sm font-medium text-surface-600 transition hover:text-primary-600"
            active-class="text-primary-600"
          >
            CRM
          </NuxtLink>
          <NuxtLink
            v-if="user && pb.authStore.token"
            to="/account"
            class="flex items-center gap-1.5 text-sm font-medium text-surface-600 transition hover:text-primary-600"
            active-class="text-primary-600"
          >
            <FontAwesomeIcon :icon="['fas', 'user-circle']" class="h-5 w-5" />
            <span>Account</span>
          </NuxtLink>
          <NuxtLink
            v-if="isAdminEmail"
            to="/admin/integrations"
            class="text-sm font-medium text-surface-600 transition hover:text-primary-600"
            active-class="text-primary-600"
          >
            Admin
          </NuxtLink>
          <div data-account-menu-root>
            <AccountMenu />
          </div>
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
const { user } = useAuthState()
const pb = usePocketbase()

const isAdminEmail = computed(() => {
  const u = user.value as { email?: string } | null
  return !!(u?.email && pb.authStore.token && u.email.toLowerCase().trim() === 'admin@vma.agency')
})

const showHeader = computed(() => {
  const path = route.path
  return path !== '/auth/login' && path !== '/auth/register'
})
</script>
