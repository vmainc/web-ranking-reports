<template>
  <section class="lh-matrix">
    <div class="lh-matrix__head">
      <h2 class="lh-matrix__title">{{ title }}</h2>
      <p v-if="subtitle" class="lh-matrix__sub">{{ subtitle }}</p>
    </div>
    <div v-if="hasAnyScore" class="lh-matrix__table-wrap">
      <table class="lh-matrix__table">
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Mobile</th>
            <th scope="col">Desktop</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cat in LIGHTHOUSE_SCORE_CATEGORIES" :key="cat.key">
            <th scope="row">{{ cat.label }}</th>
            <td>
              <span class="lh-score" :class="'lh-score--' + lighthouseScoreTone(mobileScores?.[cat.key])">
                {{ formatLighthouseScore(mobileScores?.[cat.key]) }}
              </span>
            </td>
            <td>
              <span class="lh-score" :class="'lh-score--' + lighthouseScoreTone(desktopScores?.[cat.key])">
                {{ formatLighthouseScore(desktopScores?.[cat.key]) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="lh-matrix__empty">PageSpeed scores are not available for this audit.</p>
    <div v-if="showMetrics && (mobileMetrics || desktopMetrics)" class="lh-matrix__metrics">
      <p v-if="mobileMetrics?.lcp" class="lh-matrix__metric"><strong>Mobile LCP:</strong> {{ mobileMetrics.lcp }}</p>
      <p v-if="desktopMetrics?.lcp" class="lh-matrix__metric"><strong>Desktop LCP:</strong> {{ desktopMetrics.lcp }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  formatLighthouseScore,
  lighthouseScoreTone,
  LIGHTHOUSE_SCORE_CATEGORIES,
  type LighthouseCategoryScores,
} from '~/utils/lighthouseScoreMatrix'

const props = withDefaults(
  defineProps<{
    mobile?: { scores?: LighthouseCategoryScores; metrics?: { lcp?: string } } | null
    desktop?: { scores?: LighthouseCategoryScores; metrics?: { lcp?: string } } | null
    title?: string
    subtitle?: string
    showMetrics?: boolean
  }>(),
  {
    title: 'PageSpeed Insights (Lighthouse)',
    subtitle: 'Scores from Google PageSpeed Insights — performance, SEO, accessibility, and best practices.',
    showMetrics: true,
  },
)

const mobileScores = computed(() => props.mobile?.scores)
const desktopScores = computed(() => props.desktop?.scores)
const mobileMetrics = computed(() => props.mobile?.metrics)
const desktopMetrics = computed(() => props.desktop?.metrics)

const hasAnyScore = computed(() => {
  const m = mobileScores.value
  const d = desktopScores.value
  if (!m && !d) return false
  return LIGHTHOUSE_SCORE_CATEGORIES.some((c) => m?.[c.key] != null || d?.[c.key] != null)
})
</script>

<style scoped>
.lh-matrix {
  background: var(--wrr-surface, #fff);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 20px;
}
.lh-matrix__head {
  margin-bottom: 14px;
}
.lh-matrix__title {
  margin: 0;
  font-size: 1.1rem;
}
.lh-matrix__sub {
  margin: 6px 0 0;
  font-size: 0.85rem;
  opacity: 0.75;
  line-height: 1.45;
}
.lh-matrix__table-wrap {
  overflow-x: auto;
}
.lh-matrix__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}
.lh-matrix__table th,
.lh-matrix__table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}
.lh-matrix__table thead th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
}
.lh-matrix__table tbody th[scope='row'] {
  font-weight: 600;
}
.lh-score {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.lh-score--good {
  color: #047857;
}
.lh-score--mid {
  color: #b45309;
}
.lh-score--low {
  color: #b91c1c;
}
.lh-score--none {
  opacity: 0.5;
}
.lh-matrix__empty {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.7;
}
.lh-matrix__metrics {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  font-size: 0.85rem;
  opacity: 0.85;
}
.lh-matrix__metric {
  margin: 0;
}
</style>
