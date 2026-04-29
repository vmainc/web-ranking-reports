<template>
  <div
    v-if="visible"
    class="w-full border-b px-4 py-2.5 text-white shadow-sm print:hidden"
    :class="expired ? 'border-red-300 bg-red-600' : urgent ? 'border-amber-300 bg-amber-500' : 'border-sky-300 bg-sky-600'"
  >
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 sm:px-2">
      <p class="text-sm font-medium leading-relaxed">
        {{ bannerMessage }}
      </p>
      <div class="flex shrink-0 items-center gap-2">
        <NuxtLink
          to="/dashboard/billing"
          class="rounded-md bg-white/95 px-3 py-1.5 text-xs font-semibold text-surface-900 transition hover:bg-white"
        >
          {{ expired ? 'Reactivate Account' : 'Upgrade Now' }}
        </NuxtLink>
        <button
          v-if="!expired"
          type="button"
          class="rounded-md p-1 text-white/90 transition hover:bg-white/15 hover:text-white"
          aria-label="Dismiss trial banner"
          @click="dismiss()"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const pb = usePocketbase()
const route = useRoute()
const visible = ref(false)
const urgent = ref(false)
const expired = ref(false)
const bannerMessage = ref('')

type SubscriptionStatus = {
  is_trial: boolean
  dismissed_trial_banner: boolean
  trial_days_left: number
  trial_expired: boolean
  trial_end: string | null
  plan: 'free' | 'starter' | 'growth' | 'agency'
  status: string
}

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load() {
  visible.value = false
  const token = pb.authStore.token
  if (!token) return
  try {
    const status = await $fetch<SubscriptionStatus>('/api/subscriptions/status', { headers: authHeaders() })

    // Paid subscribers should not see trial banners.
    if (status.plan !== 'free' && status.is_trial !== true) return

    if (status.trial_expired && status.plan === 'free') {
      expired.value = true
      urgent.value = true
      bannerMessage.value = 'Your trial has ended - upgrade to restore full access.'
      visible.value = true
      return
    }

    if (status.is_trial !== true || status.dismissed_trial_banner === true) return

    const daysLeft = Math.max(0, Number(status.trial_days_left || 0))
    expired.value = false
    urgent.value = daysLeft <= 3
    if (daysLeft > 7) {
      bannerMessage.value = 'You are on a free trial - unlock full reports, keyword tracking, and client-ready exports.'
    } else if (daysLeft > 3) {
      bannerMessage.value = `${daysLeft} days left - do not lose your reports and keyword tracking.`
    } else {
      bannerMessage.value = 'Trial ending soon - upgrade to keep your data and reports active.'
    }
    visible.value = true
  } catch {
    visible.value = false
  }
}

async function dismiss() {
  try {
    await $fetch('/api/subscriptions/dismiss-trial-banner', {
      method: 'POST',
      headers: authHeaders(),
    })
  } catch {
    // ignore
  }
  visible.value = false
}

watch(() => route.fullPath, () => void load())
onMounted(() => void load())
</script>

