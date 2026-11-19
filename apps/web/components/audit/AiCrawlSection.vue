<template>
  <div class="ai-crawl">
    <h2 class="section-title">
      <span class="section-title__icon section-title__icon--purple" aria-hidden="true">🤖</span>
      AI &amp; crawler access
    </h2>
    <p class="section-lead">
      Whether you publish an AI-friendly site guide and whether common AI crawlers are allowed in <code class="ai-crawl__code">robots.txt</code>.
    </p>

    <div class="signal-grid">
      <div class="signal-chip" :class="discovery.ok ? 'signal-chip--pass' : 'signal-chip--neutral'">
        <span class="signal-chip__status">{{ discovery.ok ? 'Optional +' : 'Optional' }}</span>
        <span class="signal-chip__label">{{ discovery.title }}</span>
        <p class="signal-chip__detail">{{ discovery.detail }}</p>
      </div>
      <div class="signal-chip" :class="robotsTxt ? 'signal-chip--pass' : 'signal-chip--fail'">
        <span class="signal-chip__status">{{ robotsTxt ? 'Found' : 'Missing' }}</span>
        <span class="signal-chip__label">robots.txt</span>
        <p class="signal-chip__detail">
          {{ robotsTxt ? 'Crawler rules file is present.' : 'No robots.txt — crawlers assume everything is allowed.' }}
        </p>
      </div>
    </div>

    <div v-if="displayBots.length" class="ai-crawl__bots">
      <h3 class="ai-crawl__bots-title">Common AI crawlers</h3>
      <p class="ai-crawl__bots-lead">Inferred from robots.txt (not a guarantee of live crawl behavior).</p>
      <ul class="ai-crawl__bot-list">
        <li v-for="bot in displayBots" :key="bot.name" class="ai-crawl__bot-row">
          <span class="ai-crawl__bot-name">{{ bot.name }}</span>
          <span
            class="ai-crawl__bot-pill"
            :class="{
              'ai-crawl__bot-pill--allow': bot.allowed === true,
              'ai-crawl__bot-pill--block': bot.allowed === false,
              'ai-crawl__bot-pill--default': bot.allowed == null,
            }"
            :title="botAccessHint(bot.allowed)"
          >
            {{ botAccessLabel(bot.allowed) }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  aiDiscoverySummary,
  botAccessHint,
  botAccessLabel,
  reportBotRows,
  type AiBotAccess,
} from '~/utils/aiCrawlReport'

const props = defineProps<{
  llmsTxt: boolean
  llmTxt: boolean
  robotsTxt: boolean
  bots?: AiBotAccess[]
}>()

const discovery = computed(() => aiDiscoverySummary(props.llmsTxt, props.llmTxt))
const displayBots = computed(() => reportBotRows(props.bots))
</script>

<style scoped>
.section-title {
  margin: 0 0 14px;
  font-size: 1.15rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #202124;
}
.section-title__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 10px;
  font-size: 1rem;
  flex-shrink: 0;
}
.section-title__icon--purple {
  background: #f3e8fd;
}
.section-lead {
  margin: 0 0 16px;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #5f6368;
}
.ai-crawl__code {
  font-size: 0.88em;
  background: #f1f3f4;
  padding: 1px 5px;
  border-radius: 4px;
}
.signal-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.signal-chip {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #e8eaed;
}
.signal-chip--pass {
  background: #e6f4ea;
  border-color: #ceead6;
}
.signal-chip--fail {
  background: #fce8e6;
  border-color: #f6aea9;
}
.signal-chip--neutral {
  background: #f8f9fa;
  border-color: #e8eaed;
}
.signal-chip__status {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #5f6368;
}
.signal-chip--pass .signal-chip__status {
  color: #137333;
}
.signal-chip--fail .signal-chip__status {
  color: #c5221f;
}
.signal-chip__label {
  display: block;
  margin-top: 4px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #202124;
}
.signal-chip__detail {
  margin: 6px 0 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: #5f6368;
}
.ai-crawl__bots {
  margin-top: 18px;
}
.ai-crawl__bots-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #202124;
}
.ai-crawl__bots-lead {
  margin: 4px 0 10px;
  font-size: 0.82rem;
  color: #5f6368;
}
.ai-crawl__bot-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid #e8eaed;
  border-radius: 12px;
  overflow: hidden;
}
.ai-crawl__bot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  font-size: 0.88rem;
  background: #fff;
  border-bottom: 1px solid #f1f3f4;
}
.ai-crawl__bot-row:last-child {
  border-bottom: none;
}
.ai-crawl__bot-name {
  font-weight: 500;
  color: #202124;
}
.ai-crawl__bot-pill {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 4px 10px;
  border-radius: 999px;
}
.ai-crawl__bot-pill--allow {
  background: #e6f4ea;
  color: #137333;
}
.ai-crawl__bot-pill--block {
  background: #fce8e6;
  color: #c5221f;
}
.ai-crawl__bot-pill--default {
  background: #f1f3f4;
  color: #5f6368;
}
</style>