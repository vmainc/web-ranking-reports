<template>
  <div class="flex shrink-0 items-center gap-1 sm:gap-2">
    <nav class="hidden items-center gap-0.5 md:flex lg:gap-1" aria-label="Main navigation">
      <NuxtLink
        v-for="item in navLinks"
        :key="`${item.to}-${item.label}`"
        :to="item.to"
        class="app-nav-link"
        :class="{ 'app-nav-link--active': item.active }"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>

    <button
      v-if="navReady && navLinks.length"
      type="button"
      class="app-mobile-nav-trigger inline-flex h-9 w-9 items-center justify-center rounded-lg md:hidden"
      :aria-expanded="mobileNavOpen"
      aria-controls="app-mobile-nav-panel"
      :aria-label="mobileNavOpen ? 'Close menu' : 'Open menu'"
      @click="toggleMobileNav"
    >
      <svg
        v-if="!mobileNavOpen"
        class="h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
      <svg
        v-else
        class="h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <div data-account-menu-root class="ml-0.5 sm:ml-1">
      <LayoutAccountMenu />
    </div>
  </div>
</template>

<script setup lang="ts">
const { navReady, navLinks, mobileNavOpen, toggleMobileNav } = useAppNav()
</script>
