<template>
  <div class="report-page" :style="cssVars">
    <header class="report-header">
      <div class="report-header-inner">
        <img v-if="branding?.logoUrl" :src="branding.logoUrl" :alt="branding.name" class="report-logo" />
        <div>
          <p class="report-brand">{{ branding?.name || 'Website audit' }}</p>
          <h1 class="report-title">
            {{ reportTitleLabel }}{{ report?.audit?.domain ? ` — ${report.audit.domain}` : '' }}
          </h1>
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
          <section v-if="report.audit.talkingPoints?.length" class="report-card">
            <h2>Key findings</h2>
            <ul>
              <li v-for="point in report.audit.talkingPoints" :key="point">{{ point }}</li>
            </ul>
          </section>

          <AuditLighthouseScoreMatrix
            :mobile="report.audit.lighthouseMobile"
            :desktop="report.audit.lighthouseDesktop"
          />

          <section v-if="lighthouseOpportunities.length" class="report-card">
            <h2>PageSpeed opportunities</h2>
            <p class="muted ai-intro">From the same Lighthouse run — no extra API calls.</p>
            <ul>
              <li v-for="(item, idx) in lighthouseOpportunities" :key="idx">
                {{ item.title }}<span v-if="item.detail"> — {{ item.detail }}</span>
              </li>
            </ul>
          </section>

          <section v-if="report.audit.whois" class="report-card">
            <h2>Domain &amp; WHOIS</h2>
            <dl class="detail-grid">
              <div v-if="report.audit.whois.registrar"><dt>Registrar</dt><dd>{{ report.audit.whois.registrar }}</dd></div>
              <div v-if="report.audit.whois.registrantOrg"><dt>Organization</dt><dd>{{ report.audit.whois.registrantOrg }}</dd></div>
              <div v-if="report.audit.whois.domainAgeYears != null"><dt>Domain age</dt><dd>~{{ Math.round(report.audit.whois.domainAgeYears * 10) / 10 }} years</dd></div>
              <div v-if="report.audit.whois.createdAt"><dt>Created</dt><dd>{{ report.audit.whois.createdAt }}</dd></div>
              <div v-if="report.audit.whois.expiresAt"><dt>Expires</dt><dd>{{ report.audit.whois.expiresAt }}</dd></div>
              <div v-if="report.audit.whois.nameServers?.length"><dt>Name servers</dt><dd>{{ report.audit.whois.nameServers.join(', ') }}</dd></div>
              <div v-if="report.audit.dns?.a?.length"><dt>DNS (A)</dt><dd>{{ report.audit.dns.a.join(', ') }}</dd></div>
            </dl>
          </section>

          <section v-if="report.audit.siteSignals" class="report-card">
            <h2>Site signals</h2>
            <ul>
              <li>Sitemap: {{ report.audit.siteSignals.sitemapFound ? 'found' : 'not found' }}{{ report.audit.siteSignals.sitemapUrlCount != null ? ` (~${report.audit.siteSignals.sitemapUrlCount} URLs in index)` : '' }}</li>
              <li>HTTPS homepage: {{ report.audit.siteSignals.httpsWorks ? 'reachable' : 'problem detected' }}</li>
              <li v-if="report.audit.siteSignals.httpRedirectsToHttps != null">
                HTTP redirects to HTTPS: {{ report.audit.siteSignals.httpRedirectsToHttps ? 'yes' : 'no' }}
              </li>
            </ul>
          </section>

          <section v-if="report.audit.onPage" class="report-card">
            <h2>On-page SEO</h2>
            <dl class="detail-grid">
              <div><dt>Title</dt><dd>{{ report.audit.onPage.title || '—' }}</dd></div>
              <div><dt>Meta description</dt><dd>{{ report.audit.onPage.metaDescription || '—' }}</dd></div>
              <div><dt>H1</dt><dd>{{ report.audit.onPage.h1 || '—' }} ({{ report.audit.onPage.h1Count ?? 0 }})</dd></div>
              <div><dt>Word count</dt><dd>{{ report.audit.onPage.wordCount ?? '—' }}</dd></div>
              <div><dt>Canonical</dt><dd>{{ report.audit.onPage.hasCanonical ? 'Yes' : 'Missing' }}</dd></div>
              <div><dt>Mobile viewport</dt><dd>{{ report.audit.onPage.viewportMeta ? 'Yes' : 'Missing' }}</dd></div>
              <div v-if="report.audit.onPage.ogTitle"><dt>OG title</dt><dd>{{ report.audit.onPage.ogTitle }}</dd></div>
              <div><dt>Structured data</dt><dd>{{ report.audit.onPage.hasJsonLd ? (report.audit.onPage.jsonLdTypes?.join(', ') || 'JSON-LD') : 'None detected' }}</dd></div>
            </dl>
            <ul v-if="report.audit.onPage.issues?.length" class="issues">
              <li v-for="issue in report.audit.onPage.issues" :key="issue">{{ issue }}</li>
            </ul>
          </section>

          <section v-if="report.audit.tech?.length" class="report-card">
            <h2>Tech stack</h2>
            <p>{{ report.audit.tech.join(', ') }}</p>
          </section>

          <section v-if="report.audit.aiCrawl" class="report-card">
            <h2>AI &amp; agentic crawl readiness</h2>
            <p class="muted ai-intro">
              How well the site supports AI assistants and crawlers (llms.txt, robots rules for bots like GPTBot and ClaudeBot).
            </p>
            <ul>
              <li>llms.txt: {{ report.audit.aiCrawl.llmsTxt ? 'found' : 'missing' }}</li>
              <li>llm.txt: {{ report.audit.aiCrawl.llmTxt ? 'found' : 'missing' }}</li>
              <li>robots.txt: {{ report.audit.aiCrawl.robotsTxt ? 'found' : 'missing' }}</li>
              <li v-if="report.audit.aiCrawl.aiBotsBlocked?.length">
                robots.txt may block: {{ report.audit.aiCrawl.aiBotsBlocked.join(', ') }}
              </li>
            </ul>
          </section>

          <section v-if="report.audit.claudeSummary" class="report-card">
            <h2>Technical SEO summary</h2>
            <p>{{ report.audit.claudeSummary }}</p>
            <ul v-if="report.audit.claudeIssues?.length" class="issues">
              <li v-for="issue in report.audit.claudeIssues" :key="issue.title">
                <strong>[{{ issue.severity }}]</strong> {{ issue.title }}
              </li>
            </ul>
          </section>

          <section v-if="report.audit.keywords?.length" class="report-card">
            <h2>Sample organic rankings</h2>
            <p class="muted ai-intro">A small sample from DataForSEO (limited on free embed audits).</p>
            <table class="kw-table">
              <thead>
                <tr><th>Keyword</th><th>Pos</th><th>Volume</th></tr>
              </thead>
              <tbody>
                <tr v-for="k in report.audit.keywords" :key="k.keyword">
                  <td>{{ k.keyword }}</td>
                  <td>{{ k.position }}</td>
                  <td>{{ k.searchVolume ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
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
}))
</script>

<style scoped>
.report-page {
  min-height: 100vh;
  background:
    radial-gradient(900px 360px at 0% 0%, color-mix(in srgb, var(--wrr-primary) 18%, transparent), transparent),
    #f1f5f9;
  color: var(--wrr-text);
  font-family: 'DM Sans', 'Segoe UI', sans-serif;
}
.report-header {
  background: var(--wrr-surface);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}
.report-header-inner {
  max-width: 920px;
  margin: 0 auto;
  padding: 24px 16px;
  display: flex;
  gap: 16px;
  align-items: center;
}
.report-logo {
  max-height: 48px;
  max-width: 160px;
  object-fit: contain;
}
.report-brand {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--wrr-primary);
}
.report-title {
  margin: 4px 0 0;
  font-size: 1.5rem;
  font-weight: 700;
}
.report-main {
  max-width: 920px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  display: grid;
  gap: 16px;
}
.report-card,
.score-card {
  background: var(--wrr-surface);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 20px;
}
.report-card h2 {
  margin: 0 0 12px;
  font-size: 1.1rem;
}
.report-card ul {
  margin: 0;
  padding-left: 1.2rem;
  line-height: 1.55;
}
.report-card--error {
  border-color: #fecaca;
  background: #fef2f2;
}
.score-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
.score-label {
  margin: 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.65;
}
.score-value {
  margin: 6px 0 4px;
  font-size: 2rem;
  font-weight: 700;
  color: var(--wrr-primary);
}
.muted {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.7;
}
.ai-intro {
  margin: 0 0 10px;
  line-height: 1.45;
}
.detail-grid {
  display: grid;
  gap: 10px;
  margin: 0;
}
.detail-grid dt {
  font-size: 0.75rem;
  opacity: 0.65;
}
.detail-grid dd {
  margin: 2px 0 0;
}
.issues {
  margin-top: 12px;
  color: #9a3412;
}
.kw-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.kw-table th,
.kw-table td {
  text-align: left;
  padding: 8px 6px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
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
  max-width: 920px;
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
