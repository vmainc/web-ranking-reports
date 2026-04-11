<template>
  <header
    class="relative sticky top-0 z-50 border-b border-surface-200/80 bg-white/90 backdrop-blur-md transition-shadow"
    :class="{ 'shadow-sm': scrolled }"
  >
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-surface-900">
        <span class="text-primary-600">WRR</span>
        <span class="hidden sm:inline">Web Ranking Reports</span>
      </NuxtLink>

      <nav class="hidden items-center gap-8 md:flex" aria-label="Main">
        <NuxtLink
          to="/features"
          class="text-sm font-medium text-surface-600 transition hover:text-primary-600"
          active-class="text-primary-600"
        >
          Features
        </NuxtLink>
        <NuxtLink
          to="/pricing"
          class="text-sm font-medium text-surface-600 transition hover:text-primary-600"
          active-class="text-primary-600"
        >
          Pricing
        </NuxtLink>
      </nav>

      <!-- Mobile menu -->
      <div
        v-if="menuOpen"
        class="absolute left-0 right-0 top-16 border-b border-surface-200 bg-white px-4 py-4 shadow-lg md:hidden"
      >
        <nav class="flex flex-col gap-3" aria-label="Mobile main">
          <NuxtLink to="/features" class="text-sm font-medium text-surface-800" @click="menuOpen = false">Features</NuxtLink>
          <NuxtLink to="/pricing" class="text-sm font-medium text-surface-800" @click="menuOpen = false">Pricing</NuxtLink>
        </nav>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          class="rounded-lg p-2 text-surface-600 md:hidden"
          aria-label="Open menu"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <svg v-if="!menuOpen" class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <NuxtLink
          v-if="!isAuthed"
          to="/auth/login"
          class="rounded-lg px-3 py-2 text-sm font-medium text-surface-700 transition hover:text-primary-600"
        >
          Log In
        </NuxtLink>
        <NuxtLink
          v-else
          to="/dashboard"
          class="rounded-lg px-3 py-2 text-sm font-medium text-surface-700 transition hover:text-primary-600"
        >
          Dashboard
        </NuxtLink>
        <NuxtLink
          to="/auth/register"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
        >
          Start Free
        </NuxtLink>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const pb = usePocketbase()
const scrolled = ref(false)
const menuOpen = ref(false)

const isAuthed = computed(() => pb.authStore.isValid)

onMounted(() => {
  const onScroll = () => {
    scrolled.value = window.scrollY > 8
  }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
})

const route = useRoute()
watch(
  () => route.path,
  () => {
    menuOpen.value = false
  },
)
</script>
