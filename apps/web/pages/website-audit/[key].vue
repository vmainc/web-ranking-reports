<template>
  <div class="wrr-audit-page" :style="cssVars">
    <div v-if="pending" class="wrr-audit-state">Loading form…</div>
    <div v-else-if="error" class="wrr-audit-state wrr-audit-state--error">{{ error }}</div>
    <div v-else-if="form" class="wrr-audit-shell">
      <div class="wrr-audit-card">
        <img
          v-if="form.branding.logoUrl"
          :src="form.branding.logoUrl"
          :alt="form.branding.name"
          class="wrr-audit-logo"
        />
        <p class="wrr-audit-brand">{{ form.branding.name }}</p>
        <h1 class="wrr-audit-headline">{{ form.headline }}</h1>
        <p v-if="form.subheadline" class="wrr-audit-sub">{{ form.subheadline }}</p>

        <div v-if="submitted" class="wrr-audit-success">
          <p>{{ successMessage }}</p>
          <p v-if="reportUrl" class="mt-3">
            <a :href="reportUrl" class="wrr-audit-link" target="_blank" rel="noopener">Open your report</a>
          </p>
        </div>
        <form v-else class="wrr-audit-form" @submit.prevent="onSubmit">
          <div class="sr-only" aria-hidden="true">
            <label>Fax<input v-model="honeypot" type="text" name="companyFax" tabindex="-1" autocomplete="off" /></label>
          </div>
          <label class="wrr-audit-field">
            <span>Name *</span>
            <input v-model="name" type="text" required placeholder="Your name" />
          </label>
          <label class="wrr-audit-field">
            <span>Email *</span>
            <input v-model="email" type="email" required placeholder="you@company.com" />
          </label>
          <label v-if="form.collectPhone" class="wrr-audit-field">
            <span>Phone</span>
            <input v-model="phone" type="tel" placeholder="(optional)" />
          </label>
          <label class="wrr-audit-field">
            <span>Website *</span>
            <input v-model="website" type="url" required placeholder="https://example.com" />
          </label>
          <p v-if="submitError" class="wrr-audit-error">{{ submitError }}</p>
          <button type="submit" class="wrr-audit-submit" :disabled="submitting">
            {{ submitting ? 'Starting audit…' : form.buttonLabel }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false, auth: false })

type PublicForm = {
  enabled: boolean
  headline: string
  subheadline: string
  buttonLabel: string
  successMessage: string
  collectPhone: boolean
  branding: {
    name: string
    logoUrl: string
    colors: { primary: string; accent: string; text: string; surface: string }
  }
}

const route = useRoute()
const key = computed(() => String(route.params.key || ''))

const form = ref<PublicForm | null>(null)
const pending = ref(true)
const error = ref('')
const name = ref('')
const email = ref('')
const phone = ref('')
const website = ref('')
const honeypot = ref('')
const submitting = ref(false)
const submitError = ref('')
const submitted = ref(false)
const successMessage = ref('')
const reportUrl = ref('')
const startedAt = ref(0)

const cssVars = computed(() => {
  const c = form.value?.branding.colors
  return {
    '--wrr-primary': c?.primary || '#2563EB',
    '--wrr-accent': c?.accent || '#1D4ED8',
    '--wrr-text': c?.text || '#0F172A',
    '--wrr-surface': c?.surface || '#FFFFFF',
  }
})

async function load() {
  if (!key.value) return
  pending.value = true
  error.value = ''
  try {
    form.value = await $fetch<PublicForm>(`/api/website-audit/${encodeURIComponent(key.value)}`)
    startedAt.value = Date.now()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message || err?.message || 'Form not found'
    form.value = null
  } finally {
    pending.value = false
  }
}

async function onSubmit() {
  if (honeypot.value) return
  submitting.value = true
  submitError.value = ''
  try {
    const data = await $fetch<{ success: boolean; message?: string; reportUrl?: string }>(
      `/api/website-audit/${encodeURIComponent(key.value)}/submit`,
      {
        method: 'POST',
        body: {
          name: name.value.trim(),
          email: email.value.trim(),
          phone: phone.value.trim() || undefined,
          website: website.value.trim(),
          _startedAt: startedAt.value,
          companyFax: honeypot.value,
        },
      },
    )
    submitted.value = true
    successMessage.value = data.message || form.value?.successMessage || 'Thank you!'
    reportUrl.value = data.reportUrl || ''
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    submitError.value = err?.data?.message || err?.message || 'Something went wrong.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => load())
watch(key, () => load())

useHead(() => ({
  title: form.value ? `${form.value.branding.name} — Website audit` : 'Website audit',
  meta: [{ name: 'robots', content: 'noindex' }],
}))
</script>

<style scoped>
.wrr-audit-page {
  min-height: 100vh;
  padding: 24px 16px;
  background:
    radial-gradient(1200px 500px at 10% -10%, color-mix(in srgb, var(--wrr-primary) 22%, transparent), transparent),
    linear-gradient(160deg, #f8fafc 0%, color-mix(in srgb, var(--wrr-surface) 88%, #e2e8f0) 100%);
  color: var(--wrr-text);
  font-family: 'DM Sans', 'Segoe UI', sans-serif;
}
.wrr-audit-shell {
  max-width: 480px;
  margin: 0 auto;
}
.wrr-audit-card {
  background: var(--wrr-surface);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  padding: 28px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}
.wrr-audit-logo {
  display: block;
  max-height: 44px;
  max-width: 200px;
  margin: 0 0 12px;
  object-fit: contain;
}
.wrr-audit-brand {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--wrr-primary);
}
.wrr-audit-headline {
  margin: 0 0 8px;
  font-size: 1.75rem;
  line-height: 1.15;
  font-weight: 700;
}
.wrr-audit-sub {
  margin: 0 0 22px;
  opacity: 0.8;
  line-height: 1.5;
}
.wrr-audit-field {
  display: block;
  margin: 0 0 14px;
}
.wrr-audit-field span {
  display: block;
  margin-bottom: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}
.wrr-audit-field input {
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 1rem;
  background: #fff;
  color: inherit;
}
.wrr-audit-field input:focus {
  outline: 2px solid var(--wrr-primary);
  outline-offset: 1px;
}
.wrr-audit-submit {
  width: 100%;
  margin-top: 6px;
  border: 0;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  color: #fff;
  background: var(--wrr-primary);
}
.wrr-audit-submit:disabled {
  opacity: 0.6;
  cursor: wait;
}
.wrr-audit-error {
  color: #b91c1c;
  font-size: 0.875rem;
  margin: 0 0 8px;
}
.wrr-audit-success {
  padding: 16px;
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.12);
  color: #065f46;
  line-height: 1.5;
}
.wrr-audit-link {
  color: var(--wrr-primary);
  font-weight: 600;
}
.wrr-audit-state {
  max-width: 480px;
  margin: 48px auto;
  text-align: center;
  color: #64748b;
}
.wrr-audit-state--error {
  color: #b91c1c;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.mt-3 {
  margin-top: 12px;
}
</style>
