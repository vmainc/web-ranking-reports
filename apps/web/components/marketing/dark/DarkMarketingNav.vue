<template>
  <header
    class="sticky top-0 z-50 border-b border-slate-700/60 bg-[#0f172a]/85 backdrop-blur-xl transition-shadow"
    :class="{ 'shadow-lg shadow-black/20': scrolled }"
  >
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <NuxtLink to="/" class="flex items-center gap-2.5 font-semibold text-white">
        <img src="/images/branding/wrr-logo.svg" class="h-8 w-8 shrink-0" width="32" height="32" alt="" />
        <span class="hidden sm:inline">Web Ranking Reports</span>
        <span class="sm:hidden">WRR</span>
      </NuxtLink>

      <nav class="hidden items-center gap-8 md:flex" aria-label="Main">
        <a href="#rankings" class="text-sm font-medium text-slate-400 transition hover:text-white">Rankings</a>
        <a href="#traffic" class="text-sm font-medium text-slate-400 transition hover:text-white">Traffic</a>
        <a href="#reports" class="text-sm font-medium text-slate-400 transition hover:text-white">Reports</a>
        <a href="#pricing" class="text-sm font-medium text-slate-400 transition hover:text-white">Pricing</a>
      </nav>

      <div
        v-if="menuOpen"
        class="absolute left-0 right-0 top-16 border-b border-slate-700 bg-slate-900 px-4 py-4 shadow-xl md:hidden"
      >
        <nav class="flex flex-col gap-3" aria-label="Mobile main">
          <a href="#rankings" class="text-sm font-medium text-slate-200" @click="menuOpen = false">Rankings</a>
          <a href="#traffic" class="text-sm font-medium text-slate-200" @click="menuOpen = false">Traffic</a>
          <a href="#reports" class="text-sm font-medium text-slate-200" @click="menuOpen = false">Reports</a>
          <a href="#pricing" class="text-sm font-medium text-slate-200" @click="menuOpen = false">Pricing</a>
          <NuxtLink
            v-if="!isAuthed"
            to="/auth/login"
            class="text-sm font-medium text-slate-200"
            @click="menuOpen = false"
          >
            Log in
          </NuxtLink>
        </nav>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          class="rounded-lg p-2 text-slate-400 md:hidden"
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
          class="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white sm:inline"
        >
          Log in
        </NuxtLink>
        <NuxtLink
          v-else
          to="/dashboard"
          class="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white sm:inline"
        >
          Dashboard
        </NuxtLink>
        <NuxtLink
          to="/auth/register"
          class="rounded-lg bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-110"
        >
          Start free
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
