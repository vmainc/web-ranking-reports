<template>
  <div class="report-page" :style="cssVars">
    <header class="report-header">
      <div class="report-header-inner">
        <img v-if="branding?.logoUrl" :src="branding.logoUrl" :alt="branding.name" class="report-logo" />
        <div class="report-header-text">
          <p class="report-brand">{{ branding?.name || 'Website audit' }}</p>
          <h1 class="report-title">
            {{ reportTitleLabel }}
          </h1>
          <p v-if="report?.audit?.domain || report?.website" class="report-domain">
            {{ report?.audit?.domain || report?.website }}
          </p>
        </div>
      </div>
    </header>

    <main class="report-main">
      <div v-if="pending" class="report-state">Loading report…</div>
      <div v-else-if="loadError" class="report-state report-state--error">{{ loadError }}</div>
      <template v-else-if="report">
        <section v-if="report.status === 'processing' || report.status === 'received'" class="report-card">
          <h2>Generating your report</h2>
          <p>We’re analyzing performance, SEO, tech stack, and more. This usually takes 1–2 minutes. This page refreshes automatically.</p>
          <p class="muted">Website: {{ report.website }}</p>
        </section>

        <section v-else-if="report.status === 'error'" class="report-card report-card--error">
          <h2>We couldn’t finish this audit</h2>
          <p>{{ report.error || 'Please try again later.' }}</p>
        </section>

        <template v-else-if="report.audit">
          <AuditLighthouseScoreMatrix
            variant="report"
            :mobile="report.audit.lighthouseMobile"
            :desktop="report.audit.lighthouseDesktop"
          />

          <section v-if="report.audit.talkingPoints?.length" class="report-card report-card--findings">
            <h2 class="section-title">
              <span class="section-title__icon section-title__icon--blue" aria-hidden="true">✦</span>
              Key findings
            </h2>
            <ul class="finding-list">
              <li v-for="(point, idx) in report.audit.talkingPoints" :key="point" class="finding-card">
                <span class="finding-card__num">{{ idx + 1 }}</span>
                <p>{{ point }}</p>
              </li>
            </ul>
          </section>

          <section v-if="lighthouseOpportunities.length" class="report-card report-card--ops">
            <h2 class="section-title">
              <span class="section-title__icon section-title__icon--amber" aria-hidden="true">⚡</span>
              PageSpeed opportunities
            </h2>
            <p class="section-lead">Quick wins from Lighthouse — same data Google uses for performance hints.</p>
            <ol class="opp-list">
              <li v-for="(item, idx) in lighthouseOpportunities" :key="idx" class="opp-item">
                <strong>{{ item.title }}</strong>
                <span v-if="item.detail" class="opp-detail">{{ item.detail }}</span>
              </li>
            </ol>
          </section>

          <section v-if="report.audit.siteSignals" class="report-card">
            <h2 class="section-title">
              <span class="section-title__icon section-title__icon--green" aria-hidden="true">◎</span>
              Site health signals
            </h2>
            <div class="signal-grid">
              <div class="signal-chip" :class="report.audit.siteSignals.sitemapFound ? 'signal-chip--pass' : 'signal-chip--fail'">
                <span class="signal-chip__status">{{ report.audit.siteSignals.sitemapFound ? 'Pass' : 'Missing' }}</span>
                <span class="signal-chip__label">Sitemap{{ report.audit.siteSignals.sitemapUrlCount != null ? ` (~${report.audit.siteSignals.sitemapUrlCount} URLs)` : '' }}</span>
              </div>
              <div class="signal-chip" :class="report.audit.siteSignals.httpsWorks ? 'signal-chip--pass' : 'signal-chip--fail'">
                <span class="signal-chip__status">{{ report.audit.siteSignals.httpsWorks ? 'Pass' : 'Issue' }}</span>
                <span class="signal-chip__label">HTTPS homepage</span>
              </div>
              <div
                v-if="report.audit.siteSignals.httpRedirectsToHttps != null"
                class="signal-chip"
                :class="report.audit.siteSignals.httpRedirectsToHttps ? 'signal-chip--pass' : 'signal-chip--fail'"
              >
                <span class="signal-chip__status">{{ report.audit.siteSignals.httpRedirectsToHttps ? 'Pass' : 'No' }}</span>
                <span class="signal-chip__label">HTTP → HTTPS redirect</span>
              </div>
            </div>
          </section>

          <section v-if="report.audit.whois" class="report-card">
            <h2 class="section-title">
              <span class="section-title__icon section-title__icon--slate" aria-hidden="true">🌐</span>
              Domain &amp; WHOIS
            </h2>
            <dl class="detail-grid detail-grid--tiles">
              <div v-if="report.audit.whois.registrar"><dt>Registrar</dt><dd>{{ report.audit.whois.registrar }}</dd></div>
              <div v-if="report.audit.whois.registrantOrg"><dt>Organization</dt><dd>{{ report.audit.whois.registrantOrg }}</dd></div>
              <div v-if="report.audit.whois.domainAgeYears != null"><dt>Domain age</dt><dd>~{{ Math.round(report.audit.whois.domainAgeYears * 10) / 10 }} years</dd></div>
              <div v-if="report.audit.whois.createdAt"><dt>Created</dt><dd>{{ report.audit.whois.createdAt }}</dd></div>
              <div v-if="report.audit.whois.expiresAt"><dt>Expires</dt><dd>{{ report.audit.whois.expiresAt }}</dd></div>
              <div v-if="report.audit.whois.nameServers?.length"><dt>Name servers</dt><dd>{{ report.audit.whois.nameServers.join(', ') }}</dd></div>
              <div v-if="report.audit.dns?.a?.length"><dt>DNS (A)</dt><dd>{{ report.audit.dns.a.join(', ') }}</dd></div>
            </dl>
          </section>

          <section v-if="report.audit.onPage" class="report-card">
            <h2 class="section-title">
              <span class="section-title__icon section-title__icon--blue" aria-hidden="true">🔍</span>
              On-page SEO
            </h2>
            <dl class="detail-grid detail-grid--tiles">
              <div><dt>Title</dt><dd>{{ report.audit.onPage.title || '—' }}</dd></div>
              <div><dt>Meta description</dt><dd>{{ report.audit.onPage.metaDescription || '—' }}</dd></div>
              <div><dt>H1</dt><dd>{{ report.audit.onPage.h1 || '—' }} ({{ report.audit.onPage.h1Count ?? 0 }})</dd></div>
              <div><dt>Word count</dt><dd>{{ report.audit.onPage.wordCount ?? '—' }}</dd></div>
              <div>
                <dt>Canonical</dt>
                <dd>
                  <span class="bool-pill" :class="report.audit.onPage.hasCanonical ? 'bool-pill--yes' : 'bool-pill--no'">
                    {{ report.audit.onPage.hasCanonical ? 'Yes' : 'Missing' }}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Mobile viewport</dt>
                <dd>
                  <span class="bool-pill" :class="report.audit.onPage.viewportMeta ? 'bool-pill--yes' : 'bool-pill--no'">
                    {{ report.audit.onPage.viewportMeta ? 'Yes' : 'Missing' }}
                  </span>
                </dd>
              </div>
              <div v-if="report.audit.onPage.ogTitle"><dt>OG title</dt><dd>{{ report.audit.onPage.ogTitle }}</dd></div>
              <div><dt>Structured data</dt><dd>{{ report.audit.onPage.hasJsonLd ? (report.audit.onPage.jsonLdTypes?.join(', ') || 'JSON-LD') : 'None detected' }}</dd></div>
            </dl>
            <ul v-if="report.audit.onPage.issues?.length" class="issues">
              <li v-for="issue in report.audit.onPage.issues" :key="issue">{{ issue }}</li>
            </ul>
          </section>

          <section v-if="report.audit.tech?.length" class="report-card">
            <h2 class="section-title">
              <span class="section-title__icon section-title__icon--slate" aria-hidden="true">⚙</span>
              Tech stack
            </h2>
            <div class="tag-cloud">
              <span v-for="t in report.audit.tech" :key="t" class="tech-tag">{{ t }}</span>
            </div>
          </section>

          <section v-if="report.audit.aiCrawl" class="report-card">
            <h2 class="section-title">
              <span class="section-title__icon section-title__icon--purple" aria-hidden="true">🤖</span>
              AI &amp; agentic crawl readiness
            </h2>
            <p class="section-lead">
              llms.txt, robots rules, and how bots like GPTBot and ClaudeBot may see your site.
            </p>
            <div class="signal-grid">
              <div class="signal-chip" :class="report.audit.aiCrawl.llmsTxt ? 'signal-chip--pass' : 'signal-chip--fail'">
                <span class="signal-chip__status">{{ report.audit.aiCrawl.llmsTxt ? 'Found' : 'Missing' }}</span>
                <span class="signal-chip__label">llms.txt</span>
              </div>
              <div class="signal-chip" :class="report.audit.aiCrawl.llmTxt ? 'signal-chip--pass' : 'signal-chip--fail'">
                <span class="signal-chip__status">{{ report.audit.aiCrawl.llmTxt ? 'Found' : 'Missing' }}</span>
                <span class="signal-chip__label">llm.txt</span>
              </div>
              <div class="signal-chip" :class="report.audit.aiCrawl.robotsTxt ? 'signal-chip--pass' : 'signal-chip--fail'">
                <span class="signal-chip__status">{{ report.audit.aiCrawl.robotsTxt ? 'Found' : 'Missing' }}</span>
                <span class="signal-chip__label">robots.txt</span>
              </div>
            </div>
            <p v-if="report.audit.aiCrawl.aiBotsBlocked?.length" class="ai-block-note">
              May block: {{ report.audit.aiCrawl.aiBotsBlocked.join(', ') }}
            </p>
          </section>

          <section v-if="report.audit.claudeSummary" class="report-card report-card--summary">
            <h2 class="section-title">
              <span class="section-title__icon section-title__icon--blue" aria-hidden="true">📋</span>
              Technical SEO summary
            </h2>
            <p class="summary-text">{{ report.audit.claudeSummary }}</p>
            <ul v-if="report.audit.claudeIssues?.length" class="issue-list">
              <li v-for="issue in report.audit.claudeIssues" :key="issue.title" class="issue-row">
                <span class="severity-pill" :class="'severity-pill--' + severityClass(issue.severity)">{{ issue.severity }}</span>
                <span>{{ issue.title }}</span>
              </li>
            </ul>
          </section>

          <section v-if="report.audit.keywords?.length" class="report-card">
            <h2 class="section-title">
              <span class="section-title__icon section-title__icon--green" aria-hidden="true">📈</span>
              Sample organic rankings
            </h2>
            <p class="section-lead">Sample keywords from DataForSEO (limited on free embed audits).</p>
            <div class="kw-table-wrap">
              <table class="kw-table">
                <thead>
                  <tr><th>Keyword</th><th>Position</th><th>Volume</th></tr>
                </thead>
                <tbody>
                  <tr v-for="k in report.audit.keywords" :key="k.keyword">
                    <td>{{ k.keyword }}</td>
                    <td>
                      <span class="rank-badge" :class="rankTone(k.position)">{{ k.position }}</span>
                    </td>
                    <td>{{ k.searchVolume ?? '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>
      </template>
    </main>

    <footer v-if="branding?.footerText" class="report-footer">
      <p>{{ branding.footerText }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false, auth: false })

type PublicReport = {
  status: string
  website: string
  emailSent: boolean
  error: string | null
  branding: {
    name: string
    logoUrl: string
    reportTitle?: string
    footerText?: string
    colors: { primary: string; accent: string; text: string; surface: string }
  }
  audit: {
    domain: string
    talkingPoints?: string[]
    lighthouseMobile?: {
      scores: {
        performance: number | null
        accessibility: number | null
        bestPractices: number | null
        seo: number | null
      }
      metrics?: { lcp?: string }
      opportunities?: LhOpp[]
    }
    lighthouseDesktop?: {
      scores: {
        performance: number | null
        accessibility: number | null
        bestPractices: number | null
        seo: number | null
      }
      metrics?: { lcp?: string }
      opportunities?: LhOpp[]
    }
    onPage?: {
      title?: string
      metaDescription?: string
      h1?: string
      h1Count?: number
      wordCount?: number
      hasCanonical?: boolean
      viewportMeta?: boolean
      ogTitle?: string
      ogDescription?: string
      hasJsonLd?: boolean
      jsonLdTypes?: string[]
      issues?: string[]
    }
    tech?: string[]
    aiCrawl?: { llmsTxt: boolean; llmTxt: boolean; robotsTxt: boolean; aiBotsBlocked?: string[] }
    keywords?: Array<{ keyword: string; position: number; searchVolume: number | null }>
    claudeSummary?: string | null
    claudeIssues?: Array<{ severity: string; title: string }>
    whois?: {
      registrar: string | null
      domainAgeYears: number | null
      createdAt?: string | null
      expiresAt?: string | null
      registrantOrg?: string | null
      nameServers?: string[]
    }
    dns?: { a: string[]; aaaa: string[] }
    siteSignals?: {
      sitemapFound: boolean
      sitemapUrlCount: number | null
      httpsWorks: boolean
      httpRedirectsToHttps: boolean | null
    }
  } | null
}

type LhOpp = { title: string; detail?: string }

const route = useRoute()
const token = computed(() => String(route.params.token || ''))
const report = ref<PublicReport | null>(null)
const pending = ref(true)
const loadError = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null

const branding = computed(() => report.value?.branding || null)
const reportTitleLabel = computed(
  () => branding.value?.reportTitle?.trim() || 'Website audit',
)

const lighthouseOpportunities = computed((): LhOpp[] => {
  const audit = report.value?.audit
  if (!audit) return []
  const out: LhOpp[] = []
  const seen = new Set<string>()
  for (const side of [audit.lighthouseMobile, audit.lighthouseDesktop]) {
    for (const o of side?.opportunities || []) {
      const key = o.title + (o.detail || '')
      if (seen.has(key)) continue
      seen.add(key)
      out.push(o)
      if (out.length >= 10) return out
    }
  }
  return out
})
const cssVars = computed(() => {
  const c = branding.value?.colors
  return {
    '--wrr-primary': c?.primary || '#2563EB',
    '--wrr-accent': c?.accent || '#1D4ED8',
    '--wrr-text': c?.text || '#0F172A',
    '--wrr-surface': c?.surface || '#FFFFFF',
  }
})

function severityClass(severity: string): string {
  const s = severity.toLowerCase()
  if (s.includes('high') || s.includes('critical')) return 'high'
  if (s.includes('low')) return 'low'
  return 'med'
}

function rankTone(position: number): string {
  if (position <= 3) return 'rank-badge--top'
  if (position <= 10) return 'rank-badge--good'
  if (position <= 20) return 'rank-badge--mid'
  return 'rank-badge--low'
}

async function load() {
  if (!token.value) return
  try {
    report.value = await $fetch<PublicReport>(`/api/website-audit/report/${encodeURIComponent(token.value)}`)
    loadError.value = ''
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    loadError.value = err?.data?.message || err?.message || 'Report not found'
    report.value = null
  } finally {
    pending.value = false
  }
}

function startPoll() {
  stopPoll()
  pollTimer = setInterval(async () => {
    if (!report.value || report.value.status === 'ready' || report.value.status === 'error') {
      stopPoll()
      return
    }
    await load()
  }, 4000)
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(async () => {
  await load()
  if (report.value && (report.value.status === 'processing' || report.value.status === 'received')) {
    startPoll()
  }
})
onBeforeUnmount(() => stopPoll())
watch(token, async () => {
  pending.value = true
  await load()
  if (report.value && (report.value.status === 'processing' || report.value.status === 'received')) startPoll()
  else stopPoll()
})

useHead(() => ({
  title: report.value?.audit?.domain
    ? `Audit — ${report.value.audit.domain}`
    : 'Website audit report',
  meta: [{ name: 'robots', content: 'noindex' }],
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    },
  ],
}))
</script>

<style scoped>
.report-page {
  min-height: 100vh;
  background:
    radial-gradient(1200px 480px at 100% -10%, color-mix(in srgb, var(--wrr-primary) 14%, transparent), transparent),
    radial-gradient(900px 400px at 0% 0%, color-mix(in srgb, var(--wrr-accent) 12%, transparent), transparent),
    #eef2f7;
  color: var(--wrr-text);
  font-family: 'Roboto', 'DM Sans', 'Segoe UI', sans-serif;
}
.report-header {
  background: var(--wrr-surface);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}
.report-header-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 16px;
  display: flex;
  gap: 20px;
  align-items: center;
}
.report-logo {
  max-height: 56px;
  max-width: 180px;
  object-fit: contain;
}
.report-header-text {
  min-width: 0;
}
.report-brand {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wrr-primary);
}
.report-title {
  margin: 6px 0 0;
  font-size: clamp(1.35rem, 4vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
}
.report-domain {
  margin: 8px 0 0;
  font-size: 0.95rem;
  color: #5f6368;
  word-break: break-word;
}
.report-main {
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 16px 56px;
  display: grid;
  gap: 20px;
}
.report-card {
  background: var(--wrr-surface);
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 16px;
  padding: 22px 20px;
  box-shadow: 0 1px 2px rgba(60, 64, 67, 0.08);
}
.report-card--error {
  border-color: #fecaca;
  background: #fef2f2;
}
.report-card--findings {
  background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
}
.report-card--ops {
  border-color: #fde68a;
  background: linear-gradient(180deg, #fffbeb 0%, #fff 40%);
}
.report-card--summary {
  border-left: 4px solid var(--wrr-primary);
}
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
.section-title__icon--blue {
  background: #e8f0fe;
}
.section-title__icon--green {
  background: #e6f4ea;
}
.section-title__icon--amber {
  background: #fef7e0;
}
.section-title__icon--purple {
  background: #f3e8fd;
}
.section-title__icon--slate {
  background: #f1f3f4;
}
.section-lead {
  margin: -6px 0 14px;
  font-size: 0.88rem;
  color: #5f6368;
  line-height: 1.45;
}
.finding-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.finding-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 12px;
}
.finding-card__num {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 8px;
  background: color-mix(in srgb, var(--wrr-primary) 12%, #fff);
  color: var(--wrr-primary);
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.finding-card p {
  margin: 0;
  line-height: 1.5;
  font-size: 0.95rem;
}
.opp-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}
.opp-item {
  padding: 12px 14px 12px 16px;
  border-left: 4px solid #ffa400;
  background: #fff;
  border-radius: 0 10px 10px 0;
  line-height: 1.45;
  font-size: 0.92rem;
}
.opp-detail {
  display: block;
  margin-top: 4px;
  font-size: 0.85rem;
  color: #5f6368;
}
.signal-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
.signal-chip__status {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
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
  font-size: 0.88rem;
  font-weight: 500;
  color: #202124;
}
.detail-grid {
  display: grid;
  gap: 10px;
  margin: 0;
}
.detail-grid--tiles {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.detail-grid--tiles > div {
  padding: 12px 14px;
  background: #f8f9fa;
  border-radius: 10px;
  border: 1px solid #e8eaed;
}
.detail-grid dt {
  font-size: 0.72rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #5f6368;
}
.detail-grid dd {
  margin: 6px 0 0;
  font-size: 0.92rem;
  line-height: 1.4;
  word-break: break-word;
}
.bool-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
}
.bool-pill--yes {
  background: #e6f4ea;
  color: #137333;
}
.bool-pill--no {
  background: #fce8e6;
  color: #c5221f;
}
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tech-tag {
  padding: 6px 12px;
  border-radius: 999px;
  background: #f1f3f4;
  border: 1px solid #e8eaed;
  font-size: 0.85rem;
  font-weight: 500;
  color: #3c4043;
}
.ai-block-note {
  margin: 14px 0 0;
  font-size: 0.88rem;
  color: #b06000;
  background: #fef7e0;
  padding: 10px 12px;
  border-radius: 8px;
}
.summary-text {
  margin: 0;
  line-height: 1.6;
  font-size: 0.98rem;
}
.issue-list {
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.issue-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 0.9rem;
  line-height: 1.4;
}
.severity-pill {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 6px;
}
.severity-pill--high {
  background: #fce8e6;
  color: #c5221f;
}
.severity-pill--med {
  background: #fef7e0;
  color: #b06000;
}
.severity-pill--low {
  background: #e8f0fe;
  color: #1967d2;
}
.kw-table-wrap {
  overflow-x: auto;
  border: 1px solid #e8eaed;
  border-radius: 12px;
}
.kw-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.kw-table th {
  text-align: left;
  padding: 10px 14px;
  background: #f8f9fa;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #5f6368;
}
.kw-table td {
  padding: 10px 14px;
  border-top: 1px solid #e8eaed;
}
.kw-table tbody tr:nth-child(even) {
  background: #fafafa;
}
.rank-badge {
  display: inline-flex;
  min-width: 2rem;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.rank-badge--top {
  background: #e6f4ea;
  color: #137333;
}
.rank-badge--good {
  background: #e8f0fe;
  color: #1967d2;
}
.rank-badge--mid {
  background: #fef7e0;
  color: #b06000;
}
.rank-badge--low {
  background: #f1f3f4;
  color: #5f6368;
}
.report-state {
  text-align: center;
  padding: 48px 16px;
  color: #64748b;
}
.report-state--error {
  color: #b91c1c;
}
.report-footer {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 16px 32px;
  text-align: center;
  font-size: 0.85rem;
  color: #64748b;
}
.report-footer p {
  margin: 0;
}
</style>
