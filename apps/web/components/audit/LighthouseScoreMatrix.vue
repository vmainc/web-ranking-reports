<template>
  <section class="lh-panel" :class="{ 'lh-panel--compact': variant === 'table' }">
    <div class="lh-panel__head">
      <div class="lh-panel__badge" aria-hidden="true">
        <span class="lh-panel__badge-dot" />
        PageSpeed Insights
      </div>
      <h2 class="lh-panel__title">{{ title }}</h2>
      <p v-if="subtitle" class="lh-panel__sub">{{ subtitle }}</p>
    </div>

    <template v-if="hasAnyScore">
      <div v-if="variant === 'report'" class="lh-panel__devices">
        <div v-for="side in deviceSides" :key="side.key" class="lh-device">
          <div class="lh-device__head">
            <span class="lh-device__icon" aria-hidden="true">{{ side.icon }}</span>
            <h3 class="lh-device__title">{{ side.label }}</h3>
          </div>
          <div class="lh-device__hero">
            <AuditLighthouseGauge
              :score="side.scores?.performance"
              label="Performance"
              size="lg"
            />
          </div>
          <div class="lh-device__grid">
            <AuditLighthouseGauge
              v-for="cat in secondaryCategories"
              :key="cat.key"
              :score="side.scores?.[cat.key]"
              :label="cat.label"
              size="sm"
            />
          </div>
        </div>
      </div>

      <div v-else class="lh-matrix__table-wrap">
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
                <span
                  class="lh-pill"
                  :class="'lh-pill--' + lighthouseScoreTone(mobileScores?.[cat.key])"
                >
                  {{ formatLighthouseScore(mobileScores?.[cat.key]) }}
                </span>
              </td>
              <td>
                <span
                  class="lh-pill"
                  :class="'lh-pill--' + lighthouseScoreTone(desktopScores?.[cat.key])"
                >
                  {{ formatLighthouseScore(desktopScores?.[cat.key]) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="showMetrics && (mobileMetrics?.lcp || desktopMetrics?.lcp)" class="lh-panel__metrics">
        <div v-if="mobileMetrics?.lcp" class="lh-metric">
          <span class="lh-metric__label">Mobile LCP</span>
          <span class="lh-metric__value">{{ mobileMetrics.lcp }}</span>
        </div>
        <div v-if="desktopMetrics?.lcp" class="lh-metric">
          <span class="lh-metric__label">Desktop LCP</span>
          <span class="lh-metric__value">{{ desktopMetrics.lcp }}</span>
        </div>
      </div>
    </template>

    <p v-else class="lh-panel__empty">PageSpeed scores are not available for this audit.</p>
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
    variant?: 'report' | 'table'
  }>(),
  {
    title: 'Lighthouse scores',
    subtitle: 'Lab data from Google PageSpeed — same red, amber, and green ranges as PageSpeed Insights.',
    showMetrics: true,
    variant: 'report',
  },
)

const mobileScores = computed(() => props.mobile?.scores)
const desktopScores = computed(() => props.desktop?.scores)
const mobileMetrics = computed(() => props.mobile?.metrics)
const desktopMetrics = computed(() => props.desktop?.metrics)

const secondaryCategories = computed(() =>
  LIGHTHOUSE_SCORE_CATEGORIES.filter((c) => c.key !== 'performance'),
)

const deviceSides = computed(() => [
  { key: 'mobile', label: 'Mobile', icon: '📱', scores: mobileScores.value },
  { key: 'desktop', label: 'Desktop', icon: '🖥', scores: desktopScores.value },
])

const hasAnyScore = computed(() => {
  const m = mobileScores.value
  const d = desktopScores.value
  if (!m && !d) return false
  return LIGHTHOUSE_SCORE_CATEGORIES.some((c) => m?.[c.key] != null || d?.[c.key] != null)
})
</script>

<style scoped>
.lh-panel {
  background: linear-gradient(180deg, #fff 0%, #fafafa 100%);
  border: 1px solid #dadce0;
  border-radius: 16px;
  padding: 24px 20px;
  box-shadow: 0 1px 3px rgba(60, 64, 67, 0.12);
}
.lh-panel__head {
  margin-bottom: 20px;
}
.lh-panel__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #5f6368;
  margin-bottom: 8px;
}
.lh-panel__badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4285f4, #34a853, #fbbc04, #ea4335);
}
.lh-panel__title {
  margin: 0;
  font-family: 'Roboto', 'Segoe UI', system-ui, sans-serif;
  font-size: 1.35rem;
  font-weight: 500;
  color: #202124;
}
.lh-panel__sub {
  margin: 8px 0 0;
  font-size: 0.9rem;
  color: #5f6368;
  line-height: 1.45;
  max-width: 42rem;
}
.lh-panel__devices {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
.lh-device {
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 14px;
  padding: 18px 16px 16px;
}
.lh-device__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.lh-device__icon {
  font-size: 1.1rem;
}
.lh-device__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #202124;
}
.lh-device__hero {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
  border-bottom: 1px solid #f1f3f4;
  margin-bottom: 14px;
}
.lh-device__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.lh-panel__metrics {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.lh-metric {
  flex: 1;
  min-width: 140px;
  background: #f8f9fa;
  border: 1px solid #e8eaed;
  border-radius: 10px;
  padding: 10px 14px;
}
.lh-metric__label {
  display: block;
  font-size: 0.72rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #5f6368;
}
.lh-metric__value {
  display: block;
  margin-top: 4px;
  font-size: 1rem;
  font-weight: 500;
  color: #202124;
  font-variant-numeric: tabular-nums;
}
.lh-panel__empty {
  margin: 0;
  font-size: 0.9rem;
  color: #5f6368;
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
  border-bottom: 1px solid #e8eaed;
}
.lh-pill {
  display: inline-block;
  min-width: 2.5rem;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.lh-pill--good {
  background: #e6f4ea;
  color: #137333;
}
.lh-pill--mid {
  background: #fef7e0;
  color: #b06000;
}
.lh-pill--low {
  background: #fce8e6;
  color: #c5221f;
}
.lh-pill--none {
  background: #f1f3f4;
  color: #5f6368;
}
</style>
