<template>
  <NuxtLink
    :to="to"
    class="group inline-flex items-center gap-4 rounded-xl border border-slate-700/60 bg-slate-900/50 px-5 py-5 text-left shadow-lg ring-1 ring-white/[0.03] transition duration-200 hover:bg-slate-900/80"
    :class="accent.hoverBorder"
  >
    <span
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-inner ring-1"
      :class="[accent.iconBox, accent.iconRing]"
    >
      <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
        <template v-if="variant === 'sites'">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </template>
        <template v-else-if="variant === 'reports'">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </template>
        <template v-else-if="variant === 'crm'">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </template>
        <template v-else-if="variant === 'todo'">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </template>
        <template v-else-if="variant === 'email'">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </template>
        <template v-else-if="variant === 'billing'">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5h15a2.25 2.25 0 002.25-2.25v-2.25" />
        </template>
        <template v-else-if="variant === 'agency'">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </template>
      </svg>
    </span>
    <div class="min-w-0 flex-1">
      <span class="font-semibold text-white">{{ title }}</span>
      <span class="mt-0.5 block text-sm text-slate-400 transition group-hover:text-slate-300">{{ description }}</span>
    </div>
    <span class="shrink-0 text-lg transition group-hover:translate-x-0.5" :class="accent.arrow">→</span>
  </NuxtLink>
</template>

<script setup lang="ts">
export type DashboardHubVariant = 'sites' | 'reports' | 'crm' | 'todo' | 'email' | 'billing' | 'agency'

const props = defineProps<{
  to: string
  title: string
  description: string
  variant: DashboardHubVariant
}>()

const accentMap: Record<
  DashboardHubVariant,
  { iconBox: string; iconRing: string; hoverBorder: string; arrow: string }
> = {
  sites: {
    iconBox: 'from-emerald-500/35 to-emerald-600/10 text-emerald-300',
    iconRing: 'ring-emerald-400/35',
    hoverBorder: 'hover:border-emerald-500/45 hover:shadow-emerald-500/10',
    arrow: 'text-emerald-400',
  },
  reports: {
    iconBox: 'from-orange-500/35 to-amber-600/10 text-orange-200',
    iconRing: 'ring-orange-400/35',
    hoverBorder: 'hover:border-orange-500/45 hover:shadow-orange-500/10',
    arrow: 'text-orange-400',
  },
  crm: {
    iconBox: 'from-fuchsia-500/30 to-pink-600/10 text-fuchsia-200',
    iconRing: 'ring-fuchsia-400/30',
    hoverBorder: 'hover:border-fuchsia-500/40 hover:shadow-fuchsia-500/10',
    arrow: 'text-fuchsia-400',
  },
  todo: {
    iconBox: 'from-amber-500/35 to-yellow-600/10 text-amber-200',
    iconRing: 'ring-amber-400/35',
    hoverBorder: 'hover:border-amber-500/45 hover:shadow-amber-500/10',
    arrow: 'text-amber-400',
  },
  email: {
    iconBox: 'from-sky-500/35 to-cyan-600/10 text-sky-200',
    iconRing: 'ring-sky-400/35',
    hoverBorder: 'hover:border-sky-500/45 hover:shadow-sky-500/10',
    arrow: 'text-sky-400',
  },
  billing: {
    iconBox: 'from-lime-500/30 to-green-600/10 text-lime-200',
    iconRing: 'ring-lime-400/35',
    hoverBorder: 'hover:border-lime-500/40 hover:shadow-lime-500/10',
    arrow: 'text-lime-400',
  },
  agency: {
    iconBox: 'from-[#22c55e]/40 via-emerald-500/20 to-sky-500/25 text-white',
    iconRing: 'ring-sky-400/35',
    hoverBorder: 'hover:border-sky-500/45 hover:shadow-sky-500/10',
    arrow: 'text-sky-400',
  },
}

const accent = computed(() => accentMap[props.variant])
</script>
