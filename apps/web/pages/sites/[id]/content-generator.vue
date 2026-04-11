<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading…</p>
    </div>

    <template v-else-if="site">
      <div class="mb-8">
        <NuxtLink
          :to="`/sites/${site.id}`"
          class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
        >
          ← {{ site.name }}
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-surface-900">Content generator</h1>
        <p class="mt-1 text-sm text-surface-500">
          Start from a seed keyword, pick a suggested angle, and generate a draft SEO article with meta title and description.
        </p>
      </div>

      <!-- Step 1 -->
      <section v-if="step === 1" class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="mb-3 text-lg font-medium text-surface-900">1. Seed keyword</h2>
        <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="fetchSuggestions">
          <div class="min-w-[260px] flex-1">
            <label for="cg-seed" class="mb-1 block text-xs font-medium uppercase tracking-wide text-surface-500">
              Keyword or topic
            </label>
            <input
              id="cg-seed"
              v-model="seedKeyword"
              type="text"
              class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="e.g. emergency plumber austin"
            />
          </div>
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="suggestionsLoading || !seedKeyword.trim()"
          >
            {{ suggestionsLoading ? 'Getting suggestions…' : 'Get content suggestions' }}
          </button>
        </form>
        <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
      </section>

      <!-- Step 2 -->
      <section v-if="step === 2" class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-medium text-surface-900">2. Choose a suggestion</h2>
            <p class="mt-1 text-xs text-surface-500">Seed: <span class="font-medium text-surface-700">{{ seedKeywordUsed }}</span></p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
            @click="goBackToSeed"
          >
            ← Change keyword
          </button>
        </div>
        <ul class="space-y-3">
          <li v-for="(s, idx) in suggestions" :key="idx">
            <label
              class="flex cursor-pointer gap-3 rounded-lg border p-4 transition"
              :class="
                selectedIndex === idx
                  ? 'border-primary-400 bg-primary-50/60 ring-1 ring-primary-400'
                  : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50/80'
              "
            >
              <input v-model="selectedIndex" type="radio" class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500" :value="idx" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-surface-900">{{ s.title }}</p>
                <p class="mt-1 text-xs text-surface-600">{{ s.angle }}</p>
              </div>
            </label>
          </li>
        </ul>
        <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="articleLoading || selectedIndex < 0"
            @click="generateArticle"
          >
            {{ articleLoading ? 'Writing article…' : 'Write SEO article' }}
          </button>
        </div>
      </section>

      <!-- Step 3 -->
      <section v-if="step === 3" class="space-y-6">
        <div class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-lg font-medium text-surface-900">3. Your draft</h2>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
                @click="startOver"
              >
                Start over
              </button>
              <button
                type="button"
                class="rounded-lg border border-primary-600 bg-white px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                @click="copyFullPackage"
              >
                {{ copyAllLabel }}
              </button>
            </div>
          </div>
          <div class="space-y-4">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Meta title</p>
              <p class="mt-1 text-sm font-medium text-surface-900">{{ metaTitle || '—' }}</p>
              <button
                type="button"
                class="mt-1 text-xs font-medium text-primary-600 hover:underline"
                @click="copyText(metaTitle, 'metaTitle')"
              >
                {{ copyLabel('metaTitle') }}
              </button>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Meta description</p>
              <p class="mt-1 text-sm text-surface-800">{{ metaDescription || '—' }}</p>
              <button
                type="button"
                class="mt-1 text-xs font-medium text-primary-600 hover:underline"
                @click="copyText(metaDescription, 'metaDescription')"
              >
                {{ copyLabel('metaDescription') }}
              </button>
            </div>
            <div>
              <div class="mb-1 flex items-center justify-between gap-2">
                <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Article (Markdown)</p>
                <button
                  type="button"
                  class="text-xs font-medium text-primary-600 hover:underline"
                  @click="copyText(articleMarkdown, 'article')"
                >
                  {{ copyLabel('article') }}
                </button>
              </div>
              <textarea
                readonly
                rows="22"
                class="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 font-mono text-xs text-surface-800"
                :value="articleMarkdown"
              />
            </div>
          </div>
          <p v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>
        </div>
      </section>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import { getSite } from '~/services/sites'

definePageMeta({ layout: 'default' })

interface Suggestion {
  title: string
  angle: string
}

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()

const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const step = ref<1 | 2 | 3>(1)
const seedKeyword = ref('')
const seedKeywordUsed = ref('')
const suggestions = ref<Suggestion[]>([])
const selectedIndex = ref(-1)
const suggestionsLoading = ref(false)
const articleLoading = ref(false)
const error = ref('')
const metaTitle = ref('')
const metaDescription = ref('')
const articleMarkdown = ref('')
const copiedKey = ref('')
const copyAllLabel = ref('Copy meta + article')

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function copyLabel(key: string): string {
  return copiedKey.value === key ? 'Copied!' : 'Copy'
}

async function copyText(text: string, key?: string) {
  if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return
  try {
    await navigator.clipboard.writeText(text)
    if (key) copiedKey.value = key
    setTimeout(() => {
      copiedKey.value = ''
    }, 2000)
  } catch {
    /* ignore */
  }
}

async function copyFullPackage() {
  const block = [
    `Meta title: ${metaTitle.value}`,
    '',
    `Meta description: ${metaDescription.value}`,
    '',
    '---',
    '',
    articleMarkdown.value,
  ].join('\n')
  await copyText(block)
  copyAllLabel.value = 'Copied!'
  setTimeout(() => {
    copyAllLabel.value = 'Copy meta + article'
  }, 2000)
}

async function fetchSuggestions() {
  if (!site.value || !seedKeyword.value.trim()) return
  suggestionsLoading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ seedKeyword: string; suggestions: Suggestion[] }>(
      `/api/sites/${site.value.id}/content-suggestions`,
      {
        method: 'POST',
        body: { seedKeyword: seedKeyword.value.trim() },
        headers: authHeaders(),
      },
    )
    seedKeywordUsed.value = res.seedKeyword || seedKeyword.value.trim()
    suggestions.value = res.suggestions ?? []
    selectedIndex.value = suggestions.value.length ? 0 : -1
    step.value = 2
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not load suggestions.'
  } finally {
    suggestionsLoading.value = false
  }
}

function goBackToSeed() {
  step.value = 1
  suggestions.value = []
  selectedIndex.value = -1
  error.value = ''
}

async function generateArticle() {
  if (!site.value || selectedIndex.value < 0) return
  const s = suggestions.value[selectedIndex.value]
  if (!s) return
  articleLoading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ metaTitle: string; metaDescription: string; articleMarkdown: string }>(
      `/api/sites/${site.value.id}/content-article`,
      {
        method: 'POST',
        body: {
          seedKeyword: seedKeywordUsed.value,
          suggestionTitle: s.title,
          suggestionAngle: s.angle,
        },
        headers: authHeaders(),
      },
    )
    metaTitle.value = res.metaTitle || ''
    metaDescription.value = res.metaDescription || ''
    articleMarkdown.value = res.articleMarkdown || ''
    step.value = 3
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Article generation failed.'
  } finally {
    articleLoading.value = false
  }
}

function startOver() {
  step.value = 1
  suggestions.value = []
  selectedIndex.value = -1
  metaTitle.value = ''
  metaDescription.value = ''
  articleMarkdown.value = ''
  error.value = ''
}

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
