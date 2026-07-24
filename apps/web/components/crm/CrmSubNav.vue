<template>
  <nav class="mb-8 flex flex-wrap gap-2" aria-label="CRM sections">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="rounded-lg px-4 py-2.5 text-sm font-medium transition"
      :class="tab.active ? tab.activeClass : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'"
    >
      {{ tab.label }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const path = computed(() => route.path.replace(/\/$/, '') || '/')

const tabs = computed(() => {
  const p = path.value
  return [
    {
      to: '/crm',
      label: 'Dashboard',
      active: p === '/crm',
      activeClass: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30',
    },
    {
      to: '/crm/clients',
      label: 'Contacts',
      active: p === '/crm/clients' || p.startsWith('/crm/clients/'),
      activeClass: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30',
    },
    {
      to: '/crm/pipeline',
      label: 'Leads',
      active: p === '/crm/pipeline',
      activeClass: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    },
    {
      to: '/crm/proposals',
      label: 'Proposals',
      active: (p === '/crm/proposals' || p.startsWith('/crm/proposals/')) && p !== '/crm/proposals/settings',
      activeClass: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
    },
    {
      to: '/crm/proposals/settings',
      label: 'Catalog',
      active: p === '/crm/proposals/settings',
      activeClass: 'bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30',
    },
    {
      to: '/crm/deals',
      label: 'Deals',
      active: p === '/crm/deals',
      activeClass: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30',
    },
    {
      to: '/crm/onboarding',
      label: 'Onboarding',
      active: p === '/crm/onboarding',
      activeClass: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    },
    {
      to: '/crm/seoptimer',
      label: 'SEOptimer',
      active: p === '/crm/seoptimer',
      activeClass: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30',
    },
  ]
})
</script>
