<template>
  <div class="full-report-page mx-auto max-w-4xl bg-white px-6 py-8 print:px-8 print:py-6" :style="reportStyleVars">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading report…</p>
    </div>

    <template v-else-if="site">
      <!-- Cover -->
      <header class="report-cover-page mb-12 overflow-hidden rounded-2xl border border-surface-200 bg-gradient-to-b from-white to-surface-50 p-8 print:rounded-none print:border-0 print:bg-white print:p-0">
        <div class="cover-accent print:hidden" />
        <div class="cover-watermark" aria-hidden="true">
          <img v-if="agencyLogoUrl" :src="agencyLogoUrl" alt="" class="h-full w-full object-contain" />
        </div>
        <div class="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center print:min-h-[88vh]">
          <div
            v-if="agencyLogoUrl"
            class="mb-8 inline-flex h-24 w-full max-w-md items-center justify-center rounded-2xl border border-surface-100 bg-white px-6 py-4 shadow-sm print:shadow-none"
          >
            <img
              :src="agencyLogoUrl"
              alt="Agency logo"
              class="h-full w-full object-contain"
            />
          </div>
          <p v-if="agencyName" class="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-surface-500">{{ agencyName }}</p>
          <h1 class="text-4xl font-bold tracking-tight text-surface-900 print:text-5xl">{{ site.name }}</h1>
          <p class="mt-2 text-base text-surface-500 print:text-lg">{{ site.domain }}</p>
          <div class="mt-8">
            <template v-if="!editingReportName">
              <p class="text-2xl font-semibold text-primary-600 print:text-3xl">{{ reportName || 'Full Report' }}</p>
              <button type="button" class="mt-1 rounded px-2 py-1 text-xs font-medium text-surface-500 hover:bg-surface-100 hover:text-surface-700 print:hidden" @click="editingReportName = true">Edit name</button>
            </template>
            <template v-else>
              <input
                v-model="reportName"
                type="text"
                class="max-w-md rounded border border-surface-300 px-3 py-1.5 text-xl font-semibold text-primary-600 print:hidden"
                placeholder="Report name"
                @keydown.enter="editingReportName = false"
                @blur="editingReportName = false"
              />
            </template>
          </div>
          <div class="mt-6 rounded-xl border border-surface-200 bg-white/90 px-5 py-4 shadow-sm print:shadow-none">
            <p class="text-sm text-surface-500">Generated {{ generatedAt }}</p>
            <p class="mt-1 text-sm text-surface-500">{{ dateRangeLabel }}</p>
          </div>
        </div>

        <div class="mt-2 flex flex-col gap-3 border-t border-surface-200 pt-5 print:hidden">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex flex-wrap items-center gap-3">
              <label class="text-sm font-medium text-surface-700">Date range</label>
              <select
                :value="rangePreset"
                class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900"
                @change="(e) => setRange((e.target as HTMLSelectElement).value)"
              >
                <option value="last_7_days">Last 7 days</option>
                <option value="last_28_days">Last 28 days</option>
                <option value="last_90_days">Last 90 days</option>
              </select>
              <label class="flex items-center gap-2 text-sm text-surface-600">
                <input
                  type="checkbox"
                  :checked="comparePreset !== 'none'"
                  class="rounded"
                  @change="(e) => setCompare((e.target as HTMLInputElement).checked)"
                />
                Compare to previous period
              </label>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <input
              v-model.trim="recipientEmail"
              type="email"
              class="min-w-[11rem] max-w-[16rem] rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 shadow-sm"
              placeholder="Recipient email"
              autocomplete="email"
              :disabled="sendingEmail"
            />
            <button
              type="button"
              class="rounded-lg border border-surface-300 bg-white px-4 py-2.5 text-sm font-semibold text-surface-800 shadow-sm hover:bg-surface-50 disabled:opacity-50"
              :disabled="sendingEmail"
              title="Email the full report as a PDF attachment"
              @click="sendReportEmail"
            >
              {{ sendingEmail ? 'Sending…' : 'Send now' }}
            </button>
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
              @click="openPrint"
            >
              Print / Save as PDF
            </button>
            <button
              type="button"
              class="rounded-lg border border-primary-600 bg-white px-4 py-2.5 text-sm font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-50"
              :disabled="saving"
              @click="saveReport"
            >
              {{ saving ? 'Saving…' : reportId ? 'Save report' : 'Save report (add to Reports)' }}
            </button>
            <NuxtLink :to="`/sites/${site.id}`" class="rounded-lg border border-surface-300 px-4 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50">
              Back to site
            </NuxtLink>
          </div>
          <p v-if="sendEmailFeedback" class="text-sm" :class="sendEmailOk ? 'text-emerald-700' : 'text-red-600'">
            {{ sendEmailFeedback }}
          </p>
          <div class="rounded-lg border border-surface-200 bg-surface-50 p-3">
            <div class="flex flex-wrap items-center gap-3">
              <label class="flex items-center gap-2 text-sm text-surface-700">
                <input v-model="scheduleEnabled" type="checkbox" class="rounded" />
                Schedule weekly report
              </label>
              <select
                v-model="scheduleWeekday"
                :disabled="!scheduleEnabled"
                class="rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm text-surface-900 disabled:opacity-50"
              >
                <option :value="0">Sunday</option>
                <option :value="1">Monday</option>
                <option :value="2">Tuesday</option>
                <option :value="3">Wednesday</option>
                <option :value="4">Thursday</option>
                <option :value="5">Friday</option>
                <option :value="6">Saturday</option>
              </select>
              <span class="text-xs text-surface-500">Saved with this report and shown on dashboard calendar.</span>
            </div>
          </div>
          <p v-if="saveMessage" class="text-sm" :class="saveError ? 'text-red-600' : 'text-green-600'">{{ saveMessage }}</p>
          <p class="text-xs text-surface-500">When the report has loaded, click above to open the print dialog; choose “Save as PDF” or a printer to download or print.</p>
        </div>
      </header>

      <!-- Table of contents + layout controls -->
      <nav id="toc" class="report-section report-toc-page toc mb-6 rounded-xl border border-surface-200 bg-white p-6 print:break-inside-avoid">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-surface-900">Table of contents</h2>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-surface-300 px-3 py-1.5 text-xs font-medium text-surface-700 shadow-sm hover:bg-surface-50 print:hidden"
            @click="showEditSections = true"
          >
            <span class="inline-block h-1 w-3 rounded bg-surface-400"></span>
            <span>Edit sections</span>
          </button>
        </div>
        <ol class="list-decimal space-y-2 pl-5 text-sm">
          <li v-for="item in tocItems" :key="item.id">
            <a :href="`#${item.id}`" class="text-primary-600 hover:underline print:no-underline">{{ item.title }}</a>
          </li>
        </ol>
      </nav>

      <!-- 1. Performance summary -->
      <section v-if="isSectionEnabled('performance-summary')" id="performance-summary" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('performance-summary') }}. Performance summary</h2>
        <section v-if="!hasGa" class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p>Connect Google Analytics and select a property to see this section.</p>
        </section>
        <DashboardWidgetKpiSummary
          v-else
          :site-id="site.id"
          :range="rangePreset"
          :compare="comparePreset"
          subtitle=""
          report-mode
          :show-menu="false"
        />
      </section>

      <!-- 2. Sessions trend -->
      <section v-if="isSectionEnabled('sessions-trend')" id="sessions-trend" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('sessions-trend') }}. Sessions trend</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetSessionsTrend v-else :site-id="site.id" :range="rangePreset" :compare="comparePreset" report-mode :show-menu="false" />
      </section>

      <!-- 3. Traffic channels -->
      <section v-if="isSectionEnabled('traffic-channels')" id="traffic-channels" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('traffic-channels') }}. Traffic channels</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetChannels v-else :site-id="site.id" :range="rangePreset" report-mode :show-menu="false" />
      </section>

      <!-- 4. Top countries -->
      <section v-if="isSectionEnabled('top-countries')" id="top-countries" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('top-countries') }}. Top countries</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetCountries v-else :site-id="site.id" :range="rangePreset" :limit="10" report-mode :show-menu="false" />
      </section>

      <!-- 5. Top pages -->
      <section v-if="isSectionEnabled('top-pages')" id="top-pages" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('top-pages') }}. Top pages</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetTopPages v-else :site-id="site.id" :range="rangePreset" :limit="9" report-mode :show-menu="false" />
      </section>

      <!-- 6. Landing pages -->
      <section v-if="isSectionEnabled('landing-pages')" id="landing-pages" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('landing-pages') }}. Landing pages</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetLandingPages v-else :site-id="site.id" :range="rangePreset" :limit="9" report-mode :show-menu="false" />
      </section>

      <!-- 7. Top events -->
      <section v-if="isSectionEnabled('top-events')" id="top-events" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('top-events') }}. Top events</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetEvents v-else :site-id="site.id" :range="rangePreset" :limit="10" report-mode :show-menu="false" />
      </section>

      <!-- 8. Ecommerce -->
      <section v-if="isSectionEnabled('ecommerce')" id="ecommerce" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('ecommerce') }}. Ecommerce</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetEcommerce v-else :site-id="site.id" :range="rangePreset" report-mode :show-menu="false" />
      </section>

      <!-- 9. Retention -->
      <section v-if="isSectionEnabled('retention')" id="retention" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('retention') }}. Retention</h2>
        <section v-if="!hasGa" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Analytics to see this section.</section>
        <DashboardWidgetRetention v-else :site-id="site.id" :range="rangePreset" report-mode :show-menu="false" />
      </section>

      <!-- 10. Google Ads -->
      <section v-if="isSectionEnabled('google-ads')" id="google-ads" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('google-ads') }}. Google Ads</h2>
        <section v-if="!hasAds" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google Ads for this site to see this section.</section>
        <GoogleAdsSummaryWidget v-else :site-id="site.id" />
      </section>

      <!-- 11. WooCommerce (print: own page) -->
      <section
        v-if="woocommerceEnabled && isSectionEnabled('woocommerce')"
        id="woocommerce"
        class="report-section report-woo-page mb-10 scroll-mt-6"
      >
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('woocommerce') }}. WooCommerce</h2>
        <section v-if="!wooConfigured" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Configure WooCommerce for this site to see this section.</section>
        <template v-else>
          <div v-if="wooLoading" class="rounded-lg border border-surface-200 p-6 text-center text-sm text-surface-500">Loading…</div>
          <template v-else-if="wooReport">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-medium text-surface-500">Total revenue</p>
                <p class="mt-1 text-xl font-semibold text-surface-900">{{ formatCurrency(wooReport.totalRevenue) }}</p>
                <p class="mt-0.5 text-xs text-surface-500">{{ wooReport.startDate }} – {{ wooReport.endDate }}</p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-medium text-surface-500">Orders</p>
                <p class="mt-1 text-xl font-semibold text-surface-900">{{ wooReport.totalOrders.toLocaleString() }}</p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-medium text-surface-500">Avg order value</p>
                <p class="mt-1 text-xl font-semibold text-surface-900">{{ formatCurrency(wooReport.totalOrders ? wooReport.totalRevenue / wooReport.totalOrders : 0) }}</p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-medium text-surface-500">Days with sales</p>
                <p class="mt-1 text-xl font-semibold text-surface-900">{{ wooReport.revenueByDay?.length ?? 0 }}</p>
              </div>
            </div>
            <div v-if="wooReport.topProducts?.length" class="mt-6 overflow-hidden rounded-lg border border-surface-200 bg-white">
              <p class="border-b border-surface-100 bg-surface-50 px-4 py-3 text-sm font-semibold text-surface-900">Top products by revenue</p>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-surface-200 text-sm">
                  <thead class="bg-surface-50">
                    <tr>
                      <th class="px-4 py-2 text-left font-medium text-surface-600">Product</th>
                      <th class="px-4 py-2 text-right font-medium text-surface-600">Revenue</th>
                      <th class="px-4 py-2 text-right font-medium text-surface-600">Units sold</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-200">
                    <tr v-for="row in wooReport.topProducts" :key="row.id">
                      <td class="px-4 py-2 font-medium text-surface-900">{{ row.name }}</td>
                      <td class="px-4 py-2 text-right tabular-nums text-surface-800">{{ formatCurrency(row.revenue) }}</td>
                      <td class="px-4 py-2 text-right tabular-nums text-surface-700">{{ row.quantity.toLocaleString() }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
          <p v-else class="rounded-lg border border-surface-200 p-6 text-sm text-surface-500">No sales data for the period.</p>
        </template>
      </section>

      <!-- Lighthouse: mobile + desktop (same print page as end of WooCommerce when both enabled) -->
      <section v-if="isSectionEnabled('lighthouse')" id="lighthouse" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('lighthouse') }}. Lighthouse</h2>
        <section
          v-if="!lighthouseMobile && !lighthouseDesktop"
          class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500"
        >
          Run Lighthouse from the site’s Lighthouse page for mobile and desktop to see scores here.
        </section>
        <div v-else class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm print:break-inside-avoid">
            <h3 class="mb-3 text-sm font-semibold text-surface-800">Mobile</h3>
            <div v-if="!lighthouseMobile" class="text-sm text-surface-500">No mobile Lighthouse run yet.</div>
            <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div
                v-for="cat in lighthouseCategoriesFrom(lighthouseMobile)"
                :key="'lh-m-' + cat.id"
                class="rounded-lg border border-surface-100 bg-surface-50/80 p-3 text-center"
              >
                <p class="text-xs font-medium text-surface-500">{{ cat.title }}</p>
                <p class="mt-1 text-xl font-bold" :class="lighthouseScoreClass(cat.score)">
                  {{ cat.score != null ? Math.round(cat.score * 100) : '—' }}
                </p>
              </div>
            </div>
          </div>
          <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm print:break-inside-avoid">
            <h3 class="mb-3 text-sm font-semibold text-surface-800">Desktop</h3>
            <div v-if="!lighthouseDesktop" class="text-sm text-surface-500">No desktop Lighthouse run yet.</div>
            <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div
                v-for="cat in lighthouseCategoriesFrom(lighthouseDesktop)"
                :key="'lh-d-' + cat.id"
                class="rounded-lg border border-surface-100 bg-surface-50/80 p-3 text-center"
              >
                <p class="text-xs font-medium text-surface-500">{{ cat.title }}</p>
                <p class="mt-1 text-xl font-bold" :class="lighthouseScoreClass(cat.score)">
                  {{ cat.score != null ? Math.round(cat.score * 100) : '—' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Search Console -->
      <section v-if="isSectionEnabled('search-console')" id="search-console" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('search-console') }}. Search Console</h2>
        <section v-if="!hasGsc" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Connect Google and select a Search Console property to see this section.</section>
        <template v-else>
          <div v-if="gscLoading" class="rounded-lg border border-surface-200 p-6 text-center text-sm text-surface-500">Loading…</div>
          <div v-else-if="gscSummary" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Clicks</p>
              <p class="mt-1 text-xl font-semibold text-surface-900">{{ gscSummary.clicks.toLocaleString() }}</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Impressions</p>
              <p class="mt-1 text-xl font-semibold text-surface-900">{{ gscSummary.impressions.toLocaleString() }}</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">CTR</p>
              <p class="mt-1 text-xl font-semibold text-surface-900">{{ (gscSummary.ctr * 100).toFixed(2) }}%</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <p class="text-sm font-medium text-surface-500">Avg position</p>
              <p class="mt-1 text-xl font-semibold text-surface-900">{{ gscSummary.position.toFixed(1) }}</p>
            </div>
          </div>
          <p v-else class="rounded-lg border border-surface-200 p-6 text-sm text-surface-500">No Search Console data for the period.</p>
        </template>
      </section>

      <!-- Site audit -->
      <section v-if="isSectionEnabled('site-audit')" id="site-audit" class="report-section mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('site-audit') }}. Site audit</h2>
        <section v-if="!auditResult" class="rounded-lg border border-surface-200 bg-surface-50 p-6 text-surface-500">Run a Site Audit from the site page to see findings here.</section>
        <template v-else>
          <p class="mb-4 text-sm text-surface-700">{{ auditResult.summary }}</p>
          <p class="mb-4 text-xs text-surface-500">Audited {{ auditResult.url }} · {{ formatDate(auditResult.fetchedAt) }}</p>
          <div v-if="auditResult.issues.length" class="space-y-2">
            <p class="text-sm font-medium text-surface-700">{{ auditResult.issues.length }} finding(s)</p>
            <div class="flex flex-wrap gap-2">
              <span v-if="auditErrors" class="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">{{ auditErrors }} error(s)</span>
              <span v-if="auditWarnings" class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">{{ auditWarnings }} warning(s)</span>
              <span v-if="auditInfos" class="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">{{ auditInfos }} info</span>
            </div>
          </div>
          <p v-else class="text-sm text-surface-500">No issues reported.</p>
        </template>
      </section>

      <!-- Rank tracking (print: own last page; keep block on one sheet when possible) -->
      <section v-if="isSectionEnabled('rank-tracking')" id="rank-tracking" class="report-section report-rank-tracking-page mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('rank-tracking') }}. Rank tracking</h2>
        <section class="report-rank-tracking-inner rounded-lg border border-surface-200 bg-surface-50 p-6">
          <p v-if="rankKeywordsLoading" class="text-sm text-surface-500">Loading…</p>
          <template v-else>
            <p class="mb-3 text-sm text-surface-700">{{ rankKeywords.length }} keyword(s) tracked. View full rankings on the site Rank tracking page.</p>
            <div v-if="rankKeywords.length" class="overflow-x-auto rounded-lg border border-surface-200 bg-white">
              <table class="min-w-full divide-y divide-surface-200 text-sm">
                <thead class="bg-surface-50">
                  <tr>
                    <th class="px-4 py-2 text-left font-medium text-surface-600">Keyword</th>
                    <th class="px-4 py-2 text-left font-medium text-surface-600">Position</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-200">
                  <tr v-for="kw in rankKeywords" :key="kw.id">
                    <td class="px-4 py-2 font-medium text-surface-900">{{ kw.keyword }}</td>
                    <td class="px-4 py-2">
                      <template v-if="kw.last_result_json && typeof kw.last_result_json.position === 'number'">
                        <span class="font-semibold text-primary-600">#{{ kw.last_result_json.position }}</span>
                      </template>
                      <span v-else class="text-surface-400">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </section>
      </section>

      <!-- Backlink analysis (last refresh from Backlinks page; no API cost here) -->
      <section v-if="isSectionEnabled('backlinks')" id="backlinks" class="report-section report-backlinks-page mb-10 scroll-mt-6">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">{{ sectionNumber('backlinks') }}. Backlink analysis</h2>
        <section class="report-backlinks-inner rounded-lg border border-surface-200 bg-surface-50 p-6">
          <p v-if="backlinksLoading" class="text-sm text-surface-500">Loading…</p>
          <template v-else>
            <p class="mb-3 text-sm text-surface-700">
              Profile from your last
              <NuxtLink :to="`/sites/${site.id}/backlinks`" class="text-primary-600 hover:underline print:hidden">Backlinks</NuxtLink>
              <span class="hidden print:inline">Backlinks</span>
              refresh (DataForSEO). Load data there to update this section for reports and PDFs.
            </p>
            <template v-if="backlinksData">
              <p class="mb-3 text-xs text-surface-500">
                Target <span class="font-mono text-surface-700">{{ backlinksData.target }}</span>
                · {{ formatBacklinksFetched(backlinksData.fetchedAt) }}
              </p>
              <p v-if="backlinksPartialNote" class="mb-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                {{ backlinksPartialNote }}
              </p>
              <div v-if="backlinksReportKpis.length" class="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div
                  v-for="row in backlinksReportKpis"
                  :key="row.label"
                  class="rounded-lg border border-surface-200 bg-white px-3 py-2.5"
                >
                  <p class="text-[11px] font-medium uppercase tracking-wide text-surface-500">{{ row.label }}</p>
                  <p class="mt-0.5 text-lg font-semibold text-surface-900">{{ row.value }}</p>
                </div>
              </div>
              <div v-if="backlinksTopDomains.length" class="overflow-x-auto rounded-lg border border-surface-200 bg-white">
                <p class="border-b border-surface-200 bg-surface-50 px-3 py-2 text-xs font-semibold text-surface-800">Top referring domains</p>
                <table class="min-w-full divide-y divide-surface-200 text-sm">
                  <thead class="bg-surface-50">
                    <tr>
                      <th class="px-4 py-2 text-left font-medium text-surface-600">Domain</th>
                      <th class="px-4 py-2 text-left font-medium text-surface-600">Rank</th>
                      <th class="px-4 py-2 text-left font-medium text-surface-600">Backlinks</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-200">
                    <tr v-for="(r, i) in backlinksTopDomains" :key="i">
                      <td class="px-4 py-2 font-mono text-surface-800">{{ r.domain ?? '—' }}</td>
                      <td class="px-4 py-2">{{ r.rank ?? '—' }}</td>
                      <td class="px-4 py-2">{{ formatBlNum(r.backlinks) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <p v-else class="text-sm text-surface-500">
              No cached profile yet. Open Backlinks and run “Load backlink data” once (uses DataForSEO credits); after that, weekly reports and PDFs show it here without extra API calls.
            </p>
          </template>
        </section>
      </section>

      <div class="mt-12 border-t border-surface-200 pt-8 print:hidden">
        <NuxtLink :to="`/sites/${site.id}`" class="text-primary-600 hover:underline">← Back to {{ site.name }}</NuxtLink>
      </div>
    </template>
  </div>

  <!-- Edit sections modal -->
  <Teleport to="body">
    <div
      v-if="showEditSections"
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 print:hidden"
      @click.self="showEditSections = false"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-surface-900">Edit report sections</h2>
          <button type="button" class="text-sm text-surface-500 hover:text-surface-700" @click="showEditSections = false">
            Close
          </button>
        </div>
        <p class="mb-3 text-xs text-surface-500">
          Turn sections on or off and reorder them. This only affects how the full report is laid out for this site.
        </p>
        <div class="mb-3 rounded-lg border border-surface-200 bg-surface-50 p-3">
          <p class="mb-2 text-xs font-medium text-surface-700">Apply a preset</p>
          <select
            v-model="layoutPresetSelect"
            class="w-full rounded-lg border border-surface-200 bg-white px-2 py-1.5 text-sm"
            @change="onLayoutPresetSelect"
          >
            <option value="">Choose preset…</option>
            <option value="full">Full report (all sections)</option>
            <option value="weekly_snapshot">Weekly Snapshot (overview-style)</option>
            <optgroup v-if="layoutTemplatesDetail.length" label="Your saved templates">
              <option v-for="t in layoutTemplatesDetail" :key="t.id" :value="`tpl:${t.id}`">{{ t.name }}</option>
            </optgroup>
          </select>
        </div>
        <div class="mb-3 rounded-lg border border-surface-200 bg-surface-50 p-3">
          <p class="mb-2 text-xs font-medium text-surface-700">Save layout as template</p>
          <div class="flex flex-wrap gap-2">
            <input
              v-model="saveTemplateName"
              type="text"
              placeholder="Template name"
              class="min-w-[8rem] flex-1 rounded border border-surface-200 bg-white px-2 py-1 text-sm"
            />
            <button
              type="button"
              class="shrink-0 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-500"
              @click="saveCurrentLayoutAsTemplate"
            >
              Save
            </button>
          </div>
          <p class="mt-1 text-[11px] text-surface-500">Apply saved templates from this menu on any site in your workspace.</p>
        </div>
        <ul class="max-h-80 space-y-2 overflow-y-auto pr-1 text-sm">
          <li
            v-for="section in orderedSections"
            :key="section.id"
            class="flex items-center justify-between gap-2 rounded-lg border border-surface-200 px-3 py-2"
          >
            <label class="flex flex-1 items-center gap-2">
              <input v-model="section.enabled" type="checkbox" class="h-3.5 w-3.5 rounded border-surface-300 text-primary-600" />
              <span class="font-medium text-surface-800">{{ section.title }}</span>
            </label>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="rounded border border-surface-200 px-1.5 py-0.5 text-xs text-surface-500 hover:bg-surface-50 disabled:opacity-40"
                :disabled="isFirstSection(section.id)"
                @click="moveSectionUp(section.id)"
              >
                ↑
              </button>
              <button
                type="button"
                class="rounded border border-surface-200 px-1.5 py-0.5 text-xs text-surface-500 hover:bg-surface-50 disabled:opacity-40"
                :disabled="isLastSection(section.id)"
                @click="moveSectionDown(section.id)"
              >
                ↓
              </button>
            </div>
          </li>
        </ul>
        <div class="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            class="text-xs text-surface-500 hover:text-surface-700"
            @click="resetSectionsToDefault"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-500"
            @click="showEditSections = false"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import { getSite } from '~/services/sites'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'
import {
  buildFullReportSections,
  buildWeeklySnapshotSections,
  mergeReportSections,
  sanitizeTemplateSections,
  LAYOUT_TEMPLATE_FULL,
  LAYOUT_TEMPLATE_WEEKLY_SNAPSHOT,
  LAYOUT_TEMPLATE_CUSTOM,
  type ReportSectionConfig,
} from '~/utils/reportLayoutPresets'
definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const { getStatus } = useGoogleIntegration()
const googleStatus = ref<Awaited<ReturnType<typeof getStatus>> | null>(null)

const reportId = computed(() => (route.query.reportId as string) || '')
const rangePreset = computed(() => (route.query.range as string) || 'last_28_days')
const agencyLogoUrl = ref<string | null>(null)
const comparePreset = computed(() => (route.query.compare as string) || 'previous_period')

function setRange(range: string) {
  navigateTo({
    path: route.path,
    query: { ...route.query, range },
  })
}

function setCompare(enable: boolean) {
  navigateTo({
    path: route.path,
    query: { ...route.query, compare: enable ? 'previous_period' : 'none' },
  })
}
const hasGa = computed(() => googleStatus.value?.connected && googleStatus.value?.selectedProperty)
const hasAds = computed(() => !!googleStatus.value?.connected && !!googleStatus.value?.selectedAdsCustomer)
const hasGsc = computed(() => !!googleStatus.value?.connected && !!googleStatus.value?.selectedSearchConsoleSite)

const dateRangeLabel = computed(() => {
  const r = rangePreset.value
  const c = comparePreset.value !== 'none' ? ' (vs previous period)' : ''
  if (r === 'last_7_days') return 'Last 7 days' + c
  if (r === 'last_28_days') return 'Last 28 days' + c
  if (r === 'last_90_days') return 'Last 90 days' + c
  return r + c
})

const generatedAt = ref('')
const reportName = ref('')
const editingReportName = ref(false)
const scheduleEnabled = ref(false)
const scheduleWeekday = ref<0 | 1 | 2 | 3 | 4 | 5 | 6>(1)

function defaultReportName() {
  if (!site.value) return 'Full Report'
  if (layoutTemplateKey.value === LAYOUT_TEMPLATE_WEEKLY_SNAPSHOT) return `Weekly Snapshot – ${site.value.name}`
  return `Full Report – ${site.value.name}`
}

function openPrint() {
  window.print()
}

const sendingEmail = ref(false)
const sendEmailFeedback = ref('')
const sendEmailOk = ref(false)
const recipientEmail = ref('')

function syncRecipientFromAccount() {
  const m = pb.authStore.model as { email?: string } | undefined
  const email = m?.email
  if (typeof email === 'string' && email.includes('@')) recipientEmail.value = email.trim()
}

async function sendReportEmail() {
  if (!site.value) return
  sendingEmail.value = true
  sendEmailFeedback.value = ''
  sendEmailOk.value = false
  try {
    const res = await $fetch<{ ok?: boolean; emailSent?: boolean; warning?: string }>(
      `/api/sites/${siteId.value}/report/send-email`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: {
          to: recipientEmail.value || undefined,
          range: rangePreset.value,
          compare: comparePreset.value,
          fullReport: true,
        },
      },
    )
    if (res.emailSent) {
      sendEmailOk.value = true
      sendEmailFeedback.value = 'Check your inbox for the PDF.'
    } else if (res.warning) {
      sendEmailFeedback.value = res.warning
    } else {
      sendEmailFeedback.value = 'Could not send email.'
    }
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'data' in e ? (e as { data?: { message?: string } }).data?.message : undefined
    sendEmailFeedback.value = typeof msg === 'string' ? msg : 'Could not send email.'
  } finally {
    sendingEmail.value = false
  }
}

const woocommerceEnabled = (useRuntimeConfig().public as { woocommerceEnabled?: boolean }).woocommerceEnabled !== false

function baseReportSections(): ReportSectionConfig[] {
  return buildFullReportSections(woocommerceEnabled)
}

const showEditSections = ref(false)
const sectionsConfig = ref<ReportSectionConfig[]>([...baseReportSections()])
const layoutTemplateKey = ref<'full' | 'weekly_snapshot' | 'custom'>(LAYOUT_TEMPLATE_FULL)
const layoutTemplatesDetail = ref<Array<{ id: string; name: string; sections: unknown }>>([])
const saveTemplateName = ref('')
const layoutPresetSelect = ref('')
const saving = ref(false)
const saveMessage = ref('')
const saveError = ref(false)

const orderedSections = computed(() =>
  [...sectionsConfig.value].sort((a, b) => a.order - b.order),
)

const tocItems = computed(() =>
  orderedSections.value.filter((s) => s.enabled).map((s) => ({ id: s.id, title: s.title })),
)

/** 1-based index in the enabled section list (matches TOC order). */
function sectionNumber(id: string): number {
  const list = orderedSections.value.filter((s) => s.enabled)
  const idx = list.findIndex((s) => s.id === id)
  return idx >= 0 ? idx + 1 : 0
}

function isSectionEnabled(id: string): boolean {
  const found = sectionsConfig.value.find((s) => s.id === id)
  return found ? found.enabled : true
}

function persistSections() {
  if (reportId.value || typeof window === 'undefined') return
  const key = `full_report_sections_${siteId.value}`
  try {
    window.localStorage.setItem(key, JSON.stringify(sectionsConfig.value))
  } catch {
    // ignore
  }
}

function applySectionsFromPayload(payload: unknown) {
  const sections = Array.isArray((payload as { sections?: unknown })?.sections)
    ? (payload as { sections: Partial<ReportSectionConfig>[] }).sections
    : null
  if (!sections?.length) return
  sectionsConfig.value = mergeReportSections(baseReportSections(), sections)
}

async function loadReportSections() {
  if (!reportId.value) return
  try {
    const report = await $fetch<{
      payload_json?: {
        sections?: Partial<ReportSectionConfig>[]
        name?: string
        rangePreset?: string
        comparePreset?: string
      }
    }>(`/api/reports/${reportId.value}`, { headers: authHeaders() })
    const payload = report?.payload_json
    if (payload?.sections?.length) applySectionsFromPayload(payload)
    const lk = (payload as { layoutTemplateKey?: string })?.layoutTemplateKey
    if (lk === LAYOUT_TEMPLATE_WEEKLY_SNAPSHOT || lk === LAYOUT_TEMPLATE_FULL) layoutTemplateKey.value = lk
    else if (lk === LAYOUT_TEMPLATE_CUSTOM) layoutTemplateKey.value = LAYOUT_TEMPLATE_CUSTOM
    else layoutTemplateKey.value = LAYOUT_TEMPLATE_FULL
    if (typeof payload?.name === 'string' && payload.name.trim()) reportName.value = payload.name.trim()
    else reportName.value = defaultReportName()
    const schedule = (payload as { schedule?: { enabled?: boolean; cadence?: string; weekday?: number } } | undefined)?.schedule
    if (schedule?.enabled && schedule.cadence === 'weekly') {
      scheduleEnabled.value = true
      const weekday = Number(schedule.weekday)
      scheduleWeekday.value = weekday >= 0 && weekday <= 6 ? (weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6) : 1
    } else {
      scheduleEnabled.value = false
      scheduleWeekday.value = 1
    }
    if (payload?.rangePreset || payload?.comparePreset != null) {
      const range = payload.rangePreset || 'last_28_days'
      const compare = payload.comparePreset ?? 'previous_period'
      await navigateTo({
        path: route.path,
        query: { ...route.query, range, compare },
        replace: true,
      })
    }
  } catch {
    // keep current sections (default or localStorage)
    reportName.value = defaultReportName()
    scheduleEnabled.value = false
    scheduleWeekday.value = 1
    layoutTemplateKey.value = LAYOUT_TEMPLATE_FULL
  }
}

function loadSectionsForSite() {
  if (typeof window === 'undefined') {
    sectionsConfig.value = [...baseReportSections()]
    return
  }
  if (reportId.value) {
    return
  }
  const key = `full_report_sections_${siteId.value}`
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      sectionsConfig.value = [...baseReportSections()]
      return
    }
    const parsed = JSON.parse(raw) as Partial<ReportSectionConfig>[]
    sectionsConfig.value = mergeReportSections(baseReportSections(), parsed)
  } catch {
    sectionsConfig.value = [...baseReportSections()]
  }
}

async function saveReport() {
  if (!site.value) return
  saving.value = true
  saveMessage.value = ''
  saveError.value = false
  try {
    const payload = {
      name: (reportName.value || defaultReportName()).trim(),
      sections: sectionsConfig.value,
      layoutTemplateKey: layoutTemplateKey.value,
      rangePreset: rangePreset.value,
      comparePreset: comparePreset.value,
      generatedAt: generatedAt.value,
      schedule: scheduleEnabled.value
        ? { enabled: true, cadence: 'weekly', weekday: scheduleWeekday.value }
        : { enabled: false, cadence: 'weekly', weekday: scheduleWeekday.value },
    }
    if (reportId.value) {
      await $fetch(`/api/reports/${reportId.value}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: { payload_json: payload },
      })
      saveMessage.value = 'Report settings saved.'
    } else {
      const { report } = await $fetch<{ report: { id: string } }>('/api/reports/create', {
        method: 'POST',
        headers: authHeaders(),
        body: { siteId: site.value.id },
      })
      await $fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: { payload_json: payload },
      })
      saveMessage.value = 'Report saved and added to your Reports list.'
      navigateTo({
        path: `/sites/${site.value.id}/full-report`,
        query: { reportId: report.id, range: rangePreset.value, compare: comparePreset.value },
      })
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = true
    saveMessage.value = err?.data?.message ?? err?.message ?? 'Failed to save report.'
  } finally {
    saving.value = false
  }
}

function resetSectionsToDefault() {
  sectionsConfig.value = [...baseReportSections()]
  layoutTemplateKey.value = LAYOUT_TEMPLATE_FULL
  persistSections()
}

function applyWeeklySnapshotPreset() {
  sectionsConfig.value = [...buildWeeklySnapshotSections(woocommerceEnabled)]
  layoutTemplateKey.value = LAYOUT_TEMPLATE_WEEKLY_SNAPSHOT
  if (site.value && !reportId.value) reportName.value = defaultReportName()
  persistSections()
}

async function loadLayoutTemplates() {
  try {
    const r = await $fetch<{ templates: { id: string; name: string; sections: unknown }[] }>('/api/reports/layout-templates', {
      headers: authHeaders(),
    })
    layoutTemplatesDetail.value = r.templates ?? []
  } catch {
    layoutTemplatesDetail.value = []
  }
}

function onLayoutPresetSelect() {
  const v = layoutPresetSelect.value
  if (!v) return
  if (v === 'full') {
    resetSectionsToDefault()
  } else if (v === 'weekly_snapshot') {
    applyWeeklySnapshotPreset()
  } else if (v.startsWith('tpl:')) {
    const id = v.slice(4)
    const t = layoutTemplatesDetail.value.find((x) => x.id === id)
    if (!t) return
    const partial = sanitizeTemplateSections(t.sections)
    if (!partial?.length) return
    sectionsConfig.value = mergeReportSections(baseReportSections(), partial)
    layoutTemplateKey.value = LAYOUT_TEMPLATE_CUSTOM
    if (site.value && !reportId.value) reportName.value = defaultReportName()
    persistSections()
  }
  layoutPresetSelect.value = ''
}

async function saveCurrentLayoutAsTemplate() {
  const name = saveTemplateName.value.trim()
  if (!name) return
  try {
    await $fetch('/api/reports/layout-templates', {
      method: 'POST',
      headers: authHeaders(),
      body: { name, sections: sectionsConfig.value },
    })
    saveTemplateName.value = ''
    await loadLayoutTemplates()
  } catch {
    // ignore
  }
}

function moveSectionUp(id: string) {
  const list = orderedSections.value
  const index = list.findIndex((s) => s.id === id)
  if (index <= 0) return
  const swapped = [...list]
  const tmp = swapped[index - 1]
  swapped[index - 1] = swapped[index]
  swapped[index] = tmp
  swapped.forEach((s, idx) => {
    s.order = idx + 1
  })
  sectionsConfig.value = swapped
  persistSections()
}

function moveSectionDown(id: string) {
  const list = orderedSections.value
  const index = list.findIndex((s) => s.id === id)
  if (index === -1 || index >= list.length - 1) return
  const swapped = [...list]
  const tmp = swapped[index + 1]
  swapped[index + 1] = swapped[index]
  swapped[index] = tmp
  swapped.forEach((s, idx) => {
    s.order = idx + 1
  })
  sectionsConfig.value = swapped
  persistSections()
}

function isFirstSection(id: string): boolean {
  const list = orderedSections.value
  return list[0]?.id === id
}

function isLastSection(id: string): boolean {
  const list = orderedSections.value
  return list[list.length - 1]?.id === id
}

type WooTopProduct = { id: number; name: string; quantity: number; revenue: number }
const wooReport = ref<{
  totalRevenue: number
  totalOrders: number
  startDate: string
  endDate: string
  revenueByDay?: unknown[]
  topProducts?: WooTopProduct[]
} | null>(null)
const wooLoading = ref(false)
const wooConfigured = ref(false)
const gscSummary = ref<{ clicks: number; impressions: number; ctr: number; position: number } | null>(null)
const gscLoading = ref(false)
type LighthousePayload = { categories?: Record<string, { id?: string; title?: string; score?: number }> } | null
const lighthouseMobile = ref<LighthousePayload>(null)
const lighthouseDesktop = ref<LighthousePayload>(null)
const auditResult = ref<{ summary: string; url: string; fetchedAt: string; issues: Array<{ severity?: string }> } | null>(null)
interface RankKwRow {
  id: string
  keyword: string
  search_volume?: number | null
  last_result_json?: { position?: number } | null
}
const rankKeywords = ref<RankKwRow[]>([])
const rankKeywordsLoading = ref(false)

type BacklinksReportPayload = {
  target: string
  fetchedAt: string
  costs?: Partial<Record<string, number>>
  errors?: Partial<Record<string, string>>
  summary: Record<string, unknown> | null
  referringDomains: Array<{ domain?: string; rank?: number; backlinks?: number }>
}
const backlinksData = ref<BacklinksReportPayload | null>(null)
const backlinksLoading = ref(false)

function formatBlSummaryCell(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return v.toLocaleString()
  if (typeof v === 'string') return v.trim() || '—'
  return '—'
}

const backlinksReportKpis = computed(() => {
  const s = backlinksData.value?.summary
  if (!s) return [] as { label: string; value: string }[]
  const rows: { label: string; key: string }[] = [
    { label: 'Backlinks', key: 'backlinks' },
    { label: 'Referring domains', key: 'referring_domains' },
    { label: 'Referring pages', key: 'referring_pages' },
    { label: 'Domain rank (0–100)', key: 'rank' },
    { label: 'Target spam score', key: 'target_spam_score' },
    { label: 'Backlinks spam score', key: 'backlinks_spam_score' },
    { label: 'Broken backlinks', key: 'broken_backlinks' },
  ]
  return rows.map(({ label, key }) => ({ label, value: formatBlSummaryCell(s[key]) })).filter((r) => r.value !== '—')
})

const backlinksPartialNote = computed(() => {
  const e = backlinksData.value?.errors
  if (!e) return ''
  const parts = Object.entries(e).map(([k, v]) => `${k}: ${v}`)
  return parts.length ? `Partial results: ${parts.join(' · ')}` : ''
})

const backlinksTopDomains = computed(() => (backlinksData.value?.referringDomains ?? []).slice(0, 10))

function formatBlNum(v: number | undefined | null): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return v.toLocaleString()
}

function formatBacklinksFetched(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso || '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
const agencyName = ref('')
const brandingColors = ref({
  primary: '#2563EB',
  accent: '#1D4ED8',
  text: '#0F172A',
  surface: '#FFFFFF',
})
const reportStyleVars = computed(() => ({
  '--report-primary': brandingColors.value.primary,
  '--report-accent': brandingColors.value.accent,
  '--report-text': brandingColors.value.text,
  '--report-surface': brandingColors.value.surface,
}))

function lighthouseCategoriesFrom(data: LighthousePayload) {
  const cat = data?.categories
  if (!cat) return []
  const ids = ['performance', 'accessibility', 'best-practices', 'seo'] as const
  return ids.map((id) => ({ id, title: cat[id]?.title ?? id, score: cat[id]?.score }))
}
const auditErrors = computed(() => auditResult.value?.issues.filter((i) => i.severity === 'error').length ?? 0)
const auditWarnings = computed(() => auditResult.value?.issues.filter((i) => i.severity === 'warning').length ?? 0)
const auditInfos = computed(() => auditResult.value?.issues.filter((i) => i.severity === 'info').length ?? 0)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}
function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n)
}
function lighthouseScoreClass(score: number | undefined) {
  if (score == null) return 'text-surface-400'
  const v = score * 100
  if (v >= 90) return 'text-green-600'
  if (v >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function dateRangeToStartEnd(range: string): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  if (range === 'last_7_days') start.setDate(end.getDate() - 6)
  else if (range === 'last_90_days') start.setDate(end.getDate() - 89)
  else start.setDate(end.getDate() - 27)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

onMounted(() => {
  generatedAt.value = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  syncRecipientFromAccount()
})

/** PDF export: full report runs many API calls in init(); settle after pending clears. */
useReportPdfReady(pending, 6000)

watch(
  () => siteId.value,
  () => {
    loadSectionsForSite()
  },
  { immediate: true },
)

watch(reportId, (id) => {
  if (id) loadReportSections()
})

async function refetchWooGsc() {
  if (!site.value) return
  if (wooConfigured.value) {
    wooLoading.value = true
    try {
      const { startDate, endDate } = dateRangeToStartEnd(rangePreset.value)
      const woo = await $fetch<typeof wooReport.value>('/api/woocommerce/report', {
        headers: authHeaders(),
        query: { siteId: site.value.id, startDate, endDate },
      }).catch(() => null)
      wooReport.value = woo
    } finally {
      wooLoading.value = false
    }
  }
  if (hasGsc.value) {
    gscLoading.value = true
    try {
      const { startDate, endDate } = dateRangeToStartEnd(rangePreset.value)
      const gsc = await $fetch<{ summary?: { clicks: number; impressions: number; ctr: number; position: number } }>('/api/google/search-console/report', {
        headers: authHeaders(),
        query: { siteId: site.value.id, dimension: 'date', startDate, endDate },
      }).catch(() => null)
      gscSummary.value = gsc?.summary ?? null
    } finally {
      gscLoading.value = false
    }
  }
}

watch([rangePreset, comparePreset], () => {
  if (site.value) refetchWooGsc()
})

watch(
  sectionsConfig,
  () => {
    persistSections()
  },
  { deep: true },
)

watch(showEditSections, (open) => {
  if (open) void loadLayoutTemplates()
})

async function loadAgencyLogo() {
  if (agencyLogoUrl.value) {
    URL.revokeObjectURL(agencyLogoUrl.value)
    agencyLogoUrl.value = null
  }
  try {
    const blob = await $fetch<Blob>('/api/agency/logo', { headers: authHeaders(), responseType: 'blob' })
    if (blob?.size) agencyLogoUrl.value = URL.createObjectURL(blob)
  } catch {
    // No agency logo or not configured
  }
}

async function loadBrandingColors() {
  try {
    const res = await $fetch<{ name?: string; colors?: Partial<typeof brandingColors.value> }>('/api/agency/branding')
    const colors = res?.colors ?? {}
    agencyName.value = typeof res?.name === 'string' ? res.name : ''
    brandingColors.value = {
      primary: String(colors.primary || brandingColors.value.primary),
      accent: String(colors.accent || brandingColors.value.accent),
      text: String(colors.text || brandingColors.value.text),
      surface: String(colors.surface || brandingColors.value.surface),
    }
  } catch {
    // Use defaults.
  }
}

onBeforeUnmount(() => {
  if (agencyLogoUrl.value) {
    URL.revokeObjectURL(agencyLogoUrl.value)
    agencyLogoUrl.value = null
  }
})

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    if (site.value) {
      loadAgencyLogo()
      loadBrandingColors()
      if (reportId.value) await loadReportSections()
      else {
        if (route.query.preset === 'weekly_snapshot') {
          sectionsConfig.value = [...buildWeeklySnapshotSections(woocommerceEnabled)]
          layoutTemplateKey.value = LAYOUT_TEMPLATE_WEEKLY_SNAPSHOT
        }
        reportName.value = defaultReportName()
      }
      googleStatus.value = await getStatus(site.value.id).catch(() => null)
      wooLoading.value = true
      wooConfigured.value = false
      wooReport.value = null
      try {
        const wooRes = await $fetch<{ configured: boolean }>('/api/woocommerce/config', { headers: authHeaders(), query: { siteId: site.value.id } }).catch(() => ({ configured: false }))
        wooConfigured.value = wooRes?.configured ?? false
        if (wooConfigured.value) {
          const { startDate, endDate } = dateRangeToStartEnd(rangePreset.value)
          const woo = await $fetch<typeof wooReport.value>('/api/woocommerce/report', {
            headers: authHeaders(),
            query: { siteId: site.value.id, startDate, endDate },
          }).catch(() => null)
          wooReport.value = woo
        }
      } finally {
        wooLoading.value = false
      }
      if (hasGsc.value) {
        gscLoading.value = true
        try {
          const { startDate, endDate } = dateRangeToStartEnd(rangePreset.value)
          const gsc = await $fetch<{ summary?: { clicks: number; impressions: number; ctr: number; position: number } }>('/api/google/search-console/report', {
            headers: authHeaders(),
            query: { siteId: site.value.id, dimension: 'date', startDate, endDate },
          }).catch(() => null)
          gscSummary.value = gsc?.summary ?? null
        } finally {
          gscLoading.value = false
        }
      }
      const [lm, ld] = await Promise.all([
        $fetch<LighthousePayload>('/api/lighthouse/report', {
          headers: authHeaders(),
          query: { siteId: site.value.id, strategy: 'mobile' },
        }).catch(() => null),
        $fetch<LighthousePayload>('/api/lighthouse/report', {
          headers: authHeaders(),
          query: { siteId: site.value.id, strategy: 'desktop' },
        }).catch(() => null),
      ])
      lighthouseMobile.value = lm
      lighthouseDesktop.value = ld
      const audit = await $fetch<{ result?: typeof auditResult.value }>(`/api/site-audit/${site.value.id}`, { headers: authHeaders() }).catch(() => ({}))
      auditResult.value = audit?.result ?? null
      rankKeywordsLoading.value = true
      try {
        const rank = await $fetch<{ keywords: RankKwRow[] }>(`/api/sites/${site.value.id}/rank-tracking/list`, { headers: authHeaders() }).catch(() => ({ keywords: [] }))
        rankKeywords.value = rank?.keywords ?? []
      } finally {
        rankKeywordsLoading.value = false
      }
      backlinksData.value = null
      if (isSectionEnabled('backlinks')) {
        backlinksLoading.value = true
        try {
          const bl = await $fetch<BacklinksReportPayload | null>(`/api/sites/${site.value.id}/backlinks/latest`, {
            headers: authHeaders(),
          }).catch(() => null)
          backlinksData.value =
            bl && typeof bl === 'object' && typeof (bl as BacklinksReportPayload).target === 'string'
              ? (bl as BacklinksReportPayload)
              : null
        } finally {
          backlinksLoading.value = false
        }
      }
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>

<style scoped>
.full-report-page {
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  --report-border-color: #ffffff;
  --report-primary: #2563eb;
  --report-accent: #1d4ed8;
  --report-text: #0f172a;
  --report-surface: #ffffff;
}
.report-section {
  break-inside: auto;
  page-break-inside: auto;
}
.cover-accent {
  position: absolute;
  inset: 0 auto auto 0;
  height: 10px;
  width: 100%;
  background: linear-gradient(90deg, var(--report-primary) 0%, color-mix(in srgb, var(--report-primary) 75%, #ffffff 25%) 55%, #e2e8f0 100%);
}
.cover-watermark {
  position: absolute;
  inset: 12% auto auto 50%;
  transform: translateX(-50%);
  width: min(68%, 520px);
  height: 260px;
  opacity: 0.07;
  pointer-events: none;
  filter: grayscale(0.1) saturate(0.8);
}
.toc {
  break-inside: avoid;
}
.full-report-page :deep(.border-surface-200),
.full-report-page :deep(.border-surface-300),
.full-report-page :deep(.border-surface-100) {
  border-color: var(--report-border-color) !important;
}
.full-report-page :deep(.bg-primary-600) {
  background-color: var(--report-primary) !important;
}
.full-report-page :deep(.hover\:bg-primary-500:hover) {
  background-color: var(--report-accent) !important;
}
.full-report-page :deep(.text-primary-600) {
  color: var(--report-primary) !important;
}
.full-report-page :deep(.border-primary-600) {
  border-color: var(--report-primary) !important;
}
.full-report-page :deep(.text-surface-900) {
  color: var(--report-text) !important;
}
@media print {
  .full-report-page { padding: 0; }
  .report-cover-page {
    break-after: page;
    page-break-after: always;
    min-height: 100vh;
    position: relative;
  }
  .cover-watermark {
    inset: 14% auto auto 50%;
    width: 58%;
    opacity: 0.05;
  }
  .report-toc-page {
    break-after: page;
    page-break-after: always;
    min-height: 100vh;
  }
  /* WooCommerce section starts on its own page after prior content */
  .report-woo-page {
    break-before: page;
    page-break-before: always;
  }
  /* Rank tracking: new page before section; avoid splitting heading + table across pages */
  .report-rank-tracking-page {
    break-before: page;
    page-break-before: always;
  }
  .report-rank-tracking-inner {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .report-backlinks-inner {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
</style>
