<template>
  <nav class="crm-subnav mb-8 flex flex-wrap gap-2" aria-label="CRM sections">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="rounded-lg px-4 py-2.5 text-sm font-medium transition"
      :class="tab.active ? tab.activeClass : inactiveClass"
    >
      {{ tab.label }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const { isLight } = useAppTheme()
const path = computed(() => route.path.replace(/\/$/, '') || '/')

const inactiveClass = computed(() =>
  isLight.value
    ? 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200',
)

function activeTone(tone: string) {
  if (isLight.value) {
    const light: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
      violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
      amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
      rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
      fuchsia: 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200',
      orange: 'bg-orange-50 text-orange-800 ring-1 ring-orange-200',
      emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      cyan: 'bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200',
    }
    return light[tone] ?? light.blue
  }
  const dark: Record<string, string> = {
    blue: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30',
    violet: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30',
    amber: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
    fuchsia: 'bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30',
    orange: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30',
  }
  return dark[tone] ?? dark.blue
}

const tabs = computed(() => {
  const p = path.value
  return [
    {
      to: '/crm',
      label: 'Dashboard',
      active: p === '/crm',
      activeClass: activeTone('blue'),
    },
    {
      to: '/crm/clients',
      label: 'Contacts',
      active: p === '/crm/clients' || p.startsWith('/crm/clients/'),
      activeClass: activeTone('violet'),
    },
    {
      to: '/crm/pipeline',
      label: 'Leads',
      active: p === '/crm/pipeline',
      activeClass: activeTone('amber'),
    },
    {
      to: '/crm/proposals',
      label: 'Proposals',
      active: (p === '/crm/proposals' || p.startsWith('/crm/proposals/')) && p !== '/crm/proposals/settings',
      activeClass: activeTone('rose'),
    },
    {
      to: '/crm/proposals/settings',
      label: 'Catalog',
      active: p === '/crm/proposals/settings',
      activeClass: activeTone('fuchsia'),
    },
    {
      to: '/crm/deals',
      label: 'Deals',
      active: p === '/crm/deals',
      activeClass: activeTone('orange'),
    },
    {
      to: '/crm/onboarding',
      label: 'Onboarding',
      active: p === '/crm/onboarding',
      activeClass: activeTone('emerald'),
    },
    {
      to: '/crm/seoptimer',
      label: 'SEOptimer',
      active: p === '/crm/seoptimer',
      activeClass: activeTone('cyan'),
    },
  ]
})
</script>
