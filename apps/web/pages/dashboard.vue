<template>
  <div v-if="isDashboardRoot" class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
    <h1 class="text-2xl font-semibold text-white">Dashboard</h1>
    <p class="mt-1 text-sm text-slate-400">Sites, reports and CRM.</p>
    <p
      v-if="trialBadge"
      class="mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      :class="trialBadgeUrgent ? 'border border-rose-500/40 bg-rose-500/15 text-rose-200' : 'border border-sky-500/40 bg-sky-500/15 text-sky-200'"
    >
      {{ trialBadge }}
    </p>

    <section
      v-if="weather.enabled"
      class="mt-6 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-sky-500/10 p-4 shadow-lg ring-1 ring-white/[0.04]"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wide text-amber-300">Dashboard weather</p>
          <p class="mt-1 text-lg font-semibold text-white">
            {{ weather.location }} · {{ weather.tempMetric }}°{{ weather.tempUnit }}
          </p>
          <p class="text-sm text-slate-300">
            {{ weather.weatherText }} {{ weather.isDayTime ? '☀️' : '🌙' }}
          </p>
        </div>
        <img v-if="weather.iconUrl" :src="weather.iconUrl" alt="Weather icon" class="h-12 w-12 shrink-0" />
      </div>
    </section>

    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DashboardHubLink
        v-for="tile in hubTiles"
        :key="tile.to"
        :to="tile.to"
        :title="tile.title"
        :description="tile.description"
        :variant="tile.variant"
      />
    </div>

    <section class="mt-10">
      <DashboardTodoCalendar :tasks="tasks" :pending="tasksPending" :google-events="googleEvents" />
    </section>
  </div>
  <NuxtPage v-else />
</template>

<script setup lang="ts">
import type { TodoTask } from '~/types'
import type { DashboardHubVariant } from '~/components/dashboard/DashboardHubLink.vue'
import { useAccountGoogle } from '~/composables/useAccountGoogle'

const hubTiles: Array<{
  to: string
  title: string
  description: string
  variant: DashboardHubVariant
}> = [
  { to: '/sites', title: 'My Sites', description: 'Manage sites and integrations', variant: 'sites' },
  { to: '/reports', title: 'Reports', description: 'Full report, analytics, Lighthouse', variant: 'reports' },
  { to: '/crm', title: 'CRM', description: 'Contacts, leads', variant: 'crm' },
  { to: '/to-do', title: 'To Do', description: 'Tasks and due dates by site', variant: 'todo' },
  { to: '/email', title: 'Email Campaigns', description: 'Send campaigns to your contacts', variant: 'email' },
  { to: '/dashboard/billing', title: 'Billing', description: 'Plans, limits, and usage', variant: 'billing' },
  { to: '/agency', title: 'Agency Planner', description: 'AI-powered goals and execution plans', variant: 'agency' },
]

const pb = usePocketbase()
const { getStatus: getGoogleStatus, getEvents: getGoogleEvents } = useAccountGoogle()
const route = useRoute()
const isDashboardRoot = computed(() => {
  const p = route.path.replace(/\/$/, '')
  return p === '/dashboard'
})

const tasks = ref<TodoTask[]>([])
const tasksPending = ref(true)
const googleEvents = ref<
  Array<{ id: string; summary: string; start: string; end: string; calendarId: string; calendarLabel: string; calendarColor?: string }>
>([])
const weather = ref<{
  enabled: boolean
  location?: string
  weatherText?: string
  isDayTime?: boolean
  tempMetric?: number | null
  tempUnit?: string
  iconUrl?: string
}>({ enabled: false })
const trialBadge = ref('')
const trialBadgeUrgent = ref(false)
const subscriptionsStatusMissing = useState<boolean>('subscriptions-status-missing', () => false)

async function loadTasks() {
  tasksPending.value = true
  try {
    const authId = pb.authStore.model?.id as string | undefined
    if (!authId) {
      tasks.value = []
      return
    }
    const list = await pb.collection('todo_tasks').getFullList<TodoTask>({
      filter: `user = "${authId}" && status = "open"`,
      sort: 'due_at',
      expand: 'site',
    })
    tasks.value = list
  } catch {
    tasks.value = []
  } finally {
    tasksPending.value = false
  }
}

onMounted(() => {
  loadTasks()
  void loadGoogleCalendar()
  void loadWeather()
  void loadTrialBadge()
})

async function loadGoogleCalendar() {
  try {
    const status = await getGoogleStatus()
    if (!status?.connected || !status.hasCalendarScope || !status.calendars?.length) {
      googleEvents.value = []
      return
    }
    const res = await getGoogleEvents({
      maxResults: 1000,
      timeMin: new Date().toISOString(),
    })
    googleEvents.value = res.events ?? []
  } catch {
    googleEvents.value = []
  }
}

async function loadWeather() {
  try {
    weather.value = await $fetch('/api/dashboard/weather', {
      headers: pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : undefined,
    })
  } catch {
    weather.value = { enabled: false }
  }
}

async function loadTrialBadge() {
  trialBadge.value = ''
  trialBadgeUrgent.value = false
  const token = pb.authStore.token
  if (!token || subscriptionsStatusMissing.value) return
  try {
    const status = await $fetch<{
      is_trial?: boolean
      trial_days_left?: number
      trial_expired?: boolean
      plan?: 'free' | 'starter' | 'growth' | 'agency' | 'comped'
    }>('/api/subscriptions/status', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (status.trial_expired && status.plan === 'free') {
      trialBadge.value = 'Trial ended - upgrade to restore full access'
      trialBadgeUrgent.value = true
      return
    }
    if (status.is_trial) {
      const days = Math.max(0, Number(status.trial_days_left || 0))
      if (days > 0) {
        trialBadge.value = `Trial: ${days} day${days === 1 ? '' : 's'} left`
        trialBadgeUrgent.value = days <= 3
      }
    }
  } catch (e: unknown) {
    const err = e as { status?: number; statusCode?: number }
    if ((err.statusCode ?? err.status) === 404) subscriptionsStatusMissing.value = true
    trialBadge.value = ''
  }
}
</script>
