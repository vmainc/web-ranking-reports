<template>
  <section class="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/90 to-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-violet-950">AI assistant</h3>
        <p class="mt-0.5 text-xs text-violet-900/70">
          Powered by Claude (same key as site audits &amp; content tools). Review every draft before sending.
        </p>
      </div>
      <select
        v-model="tone"
        class="rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs font-medium text-violet-950"
      >
        <option value="professional">Tone: Professional</option>
        <option value="friendly">Tone: Friendly</option>
        <option value="concise">Tone: Concise</option>
        <option value="enthusiastic">Tone: Enthusiastic</option>
      </select>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
        :disabled="busy"
        @click="run('ideas')"
      >
        Campaign ideas
      </button>
      <button
        type="button"
        class="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
        :disabled="busy"
        @click="run('subjects')"
      >
        Subject lines
      </button>
      <button
        type="button"
        class="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
        :disabled="busy"
        @click="showCompose = !showCompose"
      >
        {{ showCompose ? 'Hide compose' : 'Compose body' }}
      </button>
      <button
        type="button"
        class="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
        :disabled="busy || !bodyHtml.trim()"
        @click="showRefine = !showRefine"
      >
        {{ showRefine ? 'Hide refine' : 'Refine body' }}
      </button>
    </div>

    <div v-if="showCompose" class="mt-4 rounded-lg border border-violet-100 bg-white/80 p-3">
      <label class="block text-xs font-medium text-violet-950">What should this email say?</label>
      <textarea
        v-model="brief"
        rows="3"
        class="mt-1 w-full rounded-lg border border-violet-200 px-3 py-2 text-sm text-surface-900"
        placeholder="e.g. Invite clients to book a Q2 review, mention we launched rank tracking, single CTA to reply."
      />
      <button
        type="button"
        class="mt-2 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-50"
        :disabled="busy"
        @click="run('compose')"
      >
        Generate body
      </button>
    </div>

    <div v-if="showRefine" class="mt-4 rounded-lg border border-violet-100 bg-white/80 p-3">
      <p class="text-xs font-medium text-violet-950">Quick fixes</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="p in refinePresets"
          :key="p.label"
          type="button"
          class="rounded-md border border-surface-200 bg-surface-50 px-2 py-1 text-xs font-medium text-surface-800 hover:bg-surface-100 disabled:opacity-50"
          :disabled="busy || !bodyHtml.trim()"
          @click="refineWith(p.text)"
        >
          {{ p.label }}
        </button>
      </div>
      <label class="mt-3 block text-xs font-medium text-violet-950">Custom instruction</label>
      <textarea
        v-model="customRefine"
        rows="2"
        class="mt-1 w-full rounded-lg border border-violet-200 px-3 py-2 text-sm"
        placeholder="e.g. Add a P.S. with a link placeholder, keep under 150 words"
      />
      <button
        type="button"
        class="mt-2 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-50"
        :disabled="busy || !bodyHtml.trim() || !customRefine.trim()"
        @click="refineWith(customRefine.trim())"
      >
        Apply instruction
      </button>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-700">{{ error }}</p>
    <p v-if="busy" class="mt-3 text-xs text-violet-800">Working with Claude…</p>

    <div v-if="lastIdeas.length" class="mt-4">
      <p class="text-xs font-medium text-violet-950">Ideas — click to use as campaign name</p>
      <ul class="mt-2 space-y-1">
        <li v-for="(idea, i) in lastIdeas" :key="i">
          <button
            type="button"
            class="w-full rounded-lg border border-violet-100 bg-white px-3 py-2 text-left text-sm text-surface-800 hover:border-violet-300"
            @click="campaignName = idea.length > 80 ? idea.slice(0, 80) : idea"
          >
            {{ idea }}
          </button>
        </li>
      </ul>
    </div>

    <div v-if="lastSubjects.length" class="mt-4">
      <p class="text-xs font-medium text-violet-950">Subject lines — click to use</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="(s, i) in lastSubjects"
          :key="i"
          type="button"
          class="max-w-full rounded-full border border-violet-200 bg-white px-3 py-1 text-left text-xs font-medium text-violet-950 hover:bg-violet-50"
          @click="subject = s"
        >
          {{ s }}
        </button>
      </div>
    </div>

    <div v-if="lastBodyPreview" class="mt-4 rounded-lg border border-violet-200 bg-white p-3">
      <p class="text-xs font-medium text-violet-950">Body preview</p>
      <pre class="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded border border-surface-100 bg-surface-50 p-2 font-mono text-xs text-surface-800">{{ lastBodyPreview }}</pre>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-600"
          @click="applyBody"
        >
          Replace email body
        </button>
        <button type="button" class="text-xs font-medium text-violet-800 hover:underline" @click="lastBodyPreview = ''">
          Dismiss preview
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const campaignName = defineModel<string>('campaignName', { required: true })
const subject = defineModel<string>('subject', { required: true })
const bodyHtml = defineModel<string>('bodyHtml', { required: true })

const pb = usePocketbase()
const tone = ref('professional')
const busy = ref(false)
const error = ref('')
const brief = ref('')
const customRefine = ref('')
const showCompose = ref(false)
const showRefine = ref(false)
const lastIdeas = ref<string[]>([])
const lastSubjects = ref<string[]>([])
const lastBodyPreview = ref('')

const refinePresets = [
  { label: 'Shorter', text: 'Make the email noticeably shorter while keeping the key message and merge tokens.' },
  { label: 'Clearer', text: 'Simplify sentences and improve scannability (short paragraphs, clear CTA).' },
  { label: 'More compelling CTA', text: 'Strengthen the call-to-action without being pushy or spammy.' },
  { label: 'Warmer intro', text: 'Rewrite the opening to feel more personal and human; keep {{first_name}}.' },
]

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function run(task: 'ideas' | 'subjects' | 'compose' | 'refine', instruction?: string) {
  error.value = ''
  lastBodyPreview.value = ''
  if (task === 'ideas') lastIdeas.value = []
  if (task === 'subjects') lastSubjects.value = []

  busy.value = true
  try {
    const res = await $fetch<{
      ideas?: string[]
      subjects?: string[]
      bodyHtml?: string
    }>('/api/email-campaigns/ai', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        task,
        campaignName: campaignName.value,
        subject: subject.value,
        bodyHtml: bodyHtml.value,
        tone: tone.value,
        brief: task === 'compose' ? brief.value : undefined,
        instruction: task === 'refine' ? instruction : undefined,
      },
    })

    if (task === 'ideas' && res.ideas?.length) {
      lastIdeas.value = res.ideas
    } else if (task === 'subjects' && res.subjects?.length) {
      lastSubjects.value = res.subjects
    } else if ((task === 'compose' || task === 'refine') && res.bodyHtml) {
      lastBodyPreview.value = res.bodyHtml
      if (task === 'compose') showCompose.value = false
      if (task === 'refine') showRefine.value = false
    } else {
      error.value = 'Unexpected response. Try again.'
    }
  } catch (e: unknown) {
    const fe = e as { data?: { message?: string }; message?: string }
    error.value = fe?.data?.message || fe?.message || 'Request failed'
  } finally {
    busy.value = false
  }
}

function refineWith(text: string) {
  customRefine.value = ''
  void run('refine', text)
}

function applyBody() {
  if (lastBodyPreview.value) {
    bodyHtml.value = lastBodyPreview.value
    lastBodyPreview.value = ''
  }
}
</script>
