<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 -translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-1"
  >
    <nav
      v-if="mobileNavOpen && navLinks.length"
      id="app-mobile-nav-panel"
      class="app-mobile-nav-panel border-t py-2 md:hidden"
      aria-label="Main navigation"
    >
      <NuxtLink
        v-for="item in navLinks"
        :key="`mobile-${item.to}-${item.label}`"
        :to="item.to"
        class="app-mobile-nav-link"
        :class="{ 'app-mobile-nav-link--active': item.active }"
        @click="closeMobileNav"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>
  </Transition>
</template>

<script setup lang="ts">
const { navLinks, mobileNavOpen, closeMobileNav } = useAppNav()

onMounted(() => {
  if (typeof window === 'undefined') return
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('keydown', onKeydown)
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMobileNav()
}
</script>
