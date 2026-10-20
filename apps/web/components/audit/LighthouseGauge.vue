<template>
  <div class="lh-gauge" :class="[`lh-gauge--${size}`, `lh-gauge--${tone}`]">
    <div
      class="lh-gauge__ring"
      role="img"
      :aria-label="`${label}: ${displayScore}`"
      :style="ringStyle"
    >
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle class="lh-gauge__track" cx="40" cy="40" :r="radius" />
        <circle
          class="lh-gauge__fill"
          cx="40"
          cy="40"
          :r="radius"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeOffset"
        />
      </svg>
      <span class="lh-gauge__value">{{ displayScore }}</span>
    </div>
    <span class="lh-gauge__label">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import {
  formatLighthouseScore,
  lighthouseGaugeCircumference,
  lighthouseGaugeStrokeOffset,
  lighthouseScorePalette,
  lighthouseScoreTone,
} from '~/utils/lighthouseScoreMatrix'

const props = withDefaults(
  defineProps<{
    score: number | null | undefined
    label: string
    size?: 'lg' | 'md' | 'sm'
  }>(),
  { size: 'md' },
)

const radius = 34
const tone = computed(() => lighthouseScoreTone(props.score))
const palette = computed(() => lighthouseScorePalette(tone.value))
const displayScore = computed(() => formatLighthouseScore(props.score))
const circumference = lighthouseGaugeCircumference(radius)
const strokeOffset = computed(() => lighthouseGaugeStrokeOffset(props.score, radius))

const ringStyle = computed(() => ({
  '--lh-ring': palette.value.ring,
  '--lh-text': palette.value.text,
  '--lh-soft': palette.value.soft,
}))
</script>

<style scoped>
.lh-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.lh-gauge__ring {
  position: relative;
  width: var(--lh-gauge-size, 88px);
  height: var(--lh-gauge-size, 88px);
}
.lh-gauge--lg {
  --lh-gauge-size: 112px;
}
.lh-gauge--md {
  --lh-gauge-size: 88px;
}
.lh-gauge--sm {
  --lh-gauge-size: 72px;
}
.lh-gauge__ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.lh-gauge__track {
  fill: none;
  stroke: #e8eaed;
  stroke-width: 6;
}
.lh-gauge__fill {
  fill: none;
  stroke: var(--lh-ring);
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s ease;
}
.lh-gauge__value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Roboto', 'Segoe UI', system-ui, sans-serif;
  font-weight: 500;
  font-size: calc(var(--lh-gauge-size) * 0.28);
  font-variant-numeric: tabular-nums;
  color: var(--lh-text);
}
.lh-gauge--sm .lh-gauge__value {
  font-size: calc(var(--lh-gauge-size) * 0.32);
}
.lh-gauge__label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #3c4043;
  line-height: 1.2;
  max-width: 9rem;
}
.lh-gauge--lg .lh-gauge__label {
  font-size: 0.95rem;
  font-weight: 500;
}
.lh-gauge--none .lh-gauge__fill {
  stroke: #dadce0;
}
</style>
