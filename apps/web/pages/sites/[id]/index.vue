<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading…</p>
    </div>

    <template v-else-if="site">
      <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <NuxtLink
            to="/dashboard"
            class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
          >
            ← Dashboard
          </NuxtLink>
          <h1 class="text-2xl font-semibold text-surface-900">{{ site.name }}</h1>
          <p class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
        </div>
        <NuxtLink
          :to="`/sites/${site.id}/settings`"
          class="rounded p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-600"
          title="Site settings"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </NuxtLink>
      </div>

      <!-- KPIs -->
      <section class="mb-10">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">KPIs</h2>
        <div class="space-y-6">
          <!-- Performance summary (Google Analytics) – only when connected -->
          <div
            v-if="hasGa"
            class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm"
          >
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 class="text-base font-semibold text-surface-900">Performance summary</h3>
              <NuxtLink
                :to="`/sites/${site.id}/dashboard`"
                class="text-sm font-medium text-primary-600 hover:underline"
              >
                View full report →
              </NuxtLink>
            </div>
            <DashboardWidgetKpiSummary
              :site-id="site.id"
              range="last_28_days"
              compare="previous_period"
              :subtitle="''"
              report-mode
              :show-menu="false"
            />
          </div>
          <!-- Lighthouse scores (mobile + desktop) – when connected -->
          <div
            v-if="hasLighthouse"
            class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm"
          >
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 class="text-base font-semibold text-surface-900">Lighthouse</h3>
              <NuxtLink
                :to="`/sites/${site.id}/lighthouse`"
                class="text-sm font-medium text-primary-600 hover:underline"
              >
                View details →
              </NuxtLink>
            </div>
            <div v-if="lighthouseLoading" class="py-6 text-center text-sm text-surface-500">
              Loading scores…
            </div>
            <div v-else class="grid gap-6 sm:grid-cols-2">
              <div class="rounded-xl border border-surface-200 bg-surface-50/50 p-5">
                <p class="mb-3 text-sm font-medium text-surface-600">Mobile</p>
                <div v-if="lighthouseMobile" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div
                    v-for="cat in lighthouseCategoriesList"
                    :key="`mobile-${cat}`"
                    class="rounded-lg bg-white p-3 text-center shadow-sm"
                  >
                    <p class="text-xs font-medium text-surface-500">{{ formatLhCategory(cat) }}</p>
                    <p class="mt-1 text-lg font-bold" :class="lighthouseScoreClass(lighthouseMobile.categories?.[cat]?.score)">
                      {{ lighthouseScorePct(lighthouseMobile.categories?.[cat]?.score) }}
                    </p>
                  </div>
                </div>
                <p v-else class="text-sm text-surface-500">No report yet. Run from Lighthouse page.</p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-surface-50/50 p-5">
                <p class="mb-3 text-sm font-medium text-surface-600">Desktop</p>
                <div v-if="lighthouseDesktop" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div
                    v-for="cat in lighthouseCategoriesList"
                    :key="`desktop-${cat}`"
                    class="rounded-lg bg-white p-3 text-center shadow-sm"
                  >
                    <p class="text-xs font-medium text-surface-500">{{ formatLhCategory(cat) }}</p>
                    <p class="mt-1 text-lg font-bold" :class="lighthouseScoreClass(lighthouseDesktop.categories?.[cat]?.score)">
                      {{ lighthouseScorePct(lighthouseDesktop.categories?.[cat]?.score) }}
                    </p>
                  </div>
                </div>
                <p v-else class="text-sm text-surface-500">No report yet. Run from Lighthouse page.</p>
              </div>
            </div>
          </div>
          <!-- Google Ads summary – only when connected -->
          <div
            v-if="hasAds"
            class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm"
          >
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 class="text-base font-semibold text-surface-900">Google Ads</h3>
              <NuxtLink
                :to="`/sites/${site.id}/ads`"
                class="text-sm font-medium text-primary-600 hover:underline"
              >
                View full report →
              </NuxtLink>
            </div>
            <GoogleAdsSummaryWidget :site-id="site.id" />
          </div>
          <!-- WooCommerce sales summary (when WooCommerce is configured) -->
          <div
            v-if="wooConfigLoaded && wooConfigured"
            class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm"
          >
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 class="text-base font-semibold text-surface-900">WooCommerce</h3>
              <NuxtLink
                :to="`/sites/${site.id}/woocommerce`"
                class="text-sm font-medium text-primary-600 hover:underline"
              >
                View full report →
              </NuxtLink>
            </div>
            <p v-if="wooReportError" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {{ wooReportError }}
            </p>
            <div v-else-if="wooReportLoading && !wooReport" class="py-6 text-center text-sm text-surface-500">
              Loading sales report…
            </div>
            <div v-else-if="wooReport" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-xl border border-surface-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                <p class="text-sm font-medium text-surface-500">Total revenue</p>
                <p class="mt-1 text-2xl font-semibold text-surface-900">
                  {{ formatWooCurrency(wooReport.totalRevenue) }}
                </p>
                <p class="mt-0.5 text-xs text-surface-500">{{ wooReport.startDate }} – {{ wooReport.endDate }}</p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-medium text-surface-500">Orders</p>
                <p class="mt-1 text-2xl font-semibold text-surface-900">
                  {{ wooReport.totalOrders.toLocaleString() }}
                </p>
                <p class="mt-0.5 text-xs text-surface-500">Completed & processing</p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-medium text-surface-500">Avg order value</p>
                <p class="mt-1 text-2xl font-semibold text-surface-900">
                  {{ formatWooCurrency(wooReport.totalOrders ? wooReport.totalRevenue / wooReport.totalOrders : 0) }}
                </p>
              </div>
              <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-medium text-surface-500">Days with sales</p>
                <p class="mt-1 text-2xl font-semibold text-surface-900">
                  {{ wooReport.revenueByDay?.length ?? 0 }}
                </p>
              </div>
            </div>
          </div>
          <p v-if="!hasGa && !hasAds && (!wooConfigLoaded || !wooConfigured)" class="rounded-2xl border border-surface-200 bg-surface-50 p-6 text-center text-sm text-surface-500">
            Connect integrations below to see KPIs for this site.
          </p>
        </div>
      </section>

      <!-- Tasks -->
      <section class="mb-10">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">Tasks</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            :to="`/sites/${site.id}/dashboard`"
            class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="font-medium text-surface-900">View analytics</h3>
              <p class="mt-0.5 text-sm text-surface-500">Open the analytics dashboard</p>
            </div>
          </NuxtLink>
          <NuxtLink
            :to="`/sites/${site.id}/site-audit`"
            class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="font-medium text-surface-900">Run site audit</h3>
              <p class="mt-0.5 text-sm text-surface-500">Technical and SEO health checks</p>
            </div>
          </NuxtLink>
          <NuxtLink
            :to="`/sites/${site.id}/rank-tracking`"
            class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="font-medium text-surface-900">Check rank tracking</h3>
              <p class="mt-0.5 text-sm text-surface-500">Keywords and positions</p>
            </div>
          </NuxtLink>
          <NuxtLink
            :to="`/sites/${site.id}/lead-generation/forms`"
            class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="font-medium text-surface-900">Lead generation</h3>
              <p class="mt-0.5 text-sm text-surface-500">Forms and submissions</p>
            </div>
          </NuxtLink>
          <NuxtLink
            to="/crm/tasks"
            class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="font-medium text-surface-900">CRM tasks</h3>
              <p class="mt-0.5 text-sm text-surface-500">View and manage tasks</p>
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- Reports -->
      <section class="mb-10">
        <h2 class="mb-4 text-lg font-semibold text-surface-900">Reports</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            :to="`/sites/${site.id}/full-report`"
            class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="font-medium text-surface-900">Full report</h3>
              <p class="mt-0.5 text-sm text-surface-500">SEO, rank tracking, and metrics</p>
            </div>
          </NuxtLink>
          <NuxtLink
            :to="`/sites/${site.id}/report`"
            class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="font-medium text-surface-900">Report view</h3>
              <p class="mt-0.5 text-sm text-surface-500">Analytics report with date range</p>
            </div>
          </NuxtLink>
          <NuxtLink
            to="/reports"
            class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="font-medium text-surface-900">All reports</h3>
              <p class="mt-0.5 text-sm text-surface-500">Create and manage reports</p>
            </div>
          </NuxtLink>
          <!-- Connected integrations as report cards -->
          <NuxtLink
            v-if="hasGa"
            :to="`/sites/${site.id}/dashboard`"
            class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1">
              <svg class="h-full w-full" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="font-medium text-surface-900">Google Analytics</h3>
              <p class="mt-0.5 text-sm text-surface-500">View analytics dashboard</p>
            </div>
          </NuxtLink>
          <NuxtLink
            v-if="hasGsc"
            :to="`/sites/${site.id}/search-console`"
            class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1">
              <svg class="h-full w-full" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="font-medium text-surface-900">Google Search Console</h3>
              <p class="mt-0.5 text-sm text-surface-500">Search performance and indexing</p>
            </div>
          </NuxtLink>
          <NuxtLink
            v-if="hasGbp"
            :to="`/sites/${site.id}/business-profile`"
            class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1">
              <svg class="h-full w-full" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="font-medium text-surface-900">Google Business Profile</h3>
              <p class="mt-0.5 text-sm text-surface-500">Location and insights</p>
            </div>
          </NuxtLink>
          <NuxtLink
            v-if="hasAds"
            :to="`/sites/${site.id}/ads`"
            class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1">
              <svg class="h-full w-full" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="font-medium text-surface-900">Google Ads</h3>
              <p class="mt-0.5 text-sm text-surface-500">Campaigns and performance</p>
            </div>
          </NuxtLink>
          <NuxtLink
            v-if="hasLighthouse"
            :to="`/sites/${site.id}/lighthouse`"
            class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1">
              <svg class="h-full w-full" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="font-medium text-surface-900">Lighthouse</h3>
              <p class="mt-0.5 text-sm text-surface-500">Performance and SEO audits</p>
            </div>
          </NuxtLink>
        </div>
      </section>

      <section v-if="disconnectedProviders.length > 0" class="mb-10">
        <div
          v-if="googleConnectedToast"
          class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800"
        >
          Google connected successfully. Use <strong>View</strong> on Google Analytics to choose a property and see reports.
        </div>
        <h2 class="mb-4 text-lg font-medium text-surface-900">Integrations</h2>
        <p class="mb-6 text-sm text-surface-500">
          Connect data sources for this site. When connected, they appear under Reports above. Manage or disconnect from Site settings.
        </p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SiteIntegrationCard
            v-for="provider in disconnectedProviders"
            :key="provider"
            :site-id="site.id"
            :provider="provider"
            :integration="integrationByProvider(provider)"
            :google-status="googleStatus"
            :other-connected-site="otherConnectedSite"
            :show-disconnect="false"
            @updated="refreshIntegrations"
          />
        </div>
      </section>
      <section v-else class="mb-10">
        <div
          v-if="googleConnectedToast"
          class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800"
        >
          Google connected successfully. Use <strong>View</strong> on Google Analytics to choose a property and see reports.
        </div>
        <p class="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-600">
          All data sources connected. Manage integrations in
          <NuxtLink :to="`/sites/${site.id}/settings`" class="font-medium text-primary-600 hover:underline">Site settings</NuxtLink>.
        </p>
      </section>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord, IntegrationRecord, IntegrationProvider } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import { getSite } from '~/services/sites'
import { listIntegrationsBySite, getProviderList } from '~/services/integrations'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'

const route = useRoute()
const siteId = computed(() => route.params.id as string)

const pb = usePocketbase()
const { getStatus, getOtherConnectedSite } = useGoogleIntegration()
const site = ref<SiteRecord | null>(null)
const integrations = ref<IntegrationRecord[]>([])
const googleStatus = ref<GoogleStatusResponse | null>(null)
const googleConnectedToast = ref(false)
const otherConnectedSite = ref<{ otherSiteId: string; otherSiteName: string | null } | null>(null)
const pending = ref(true)

const hasGa = computed(() => !!googleStatus.value?.connected && !!googleStatus.value?.selectedProperty)
const hasAds = computed(() => !!googleStatus.value?.connected && !!googleStatus.value?.selectedAdsCustomer)
const hasLighthouse = computed(() => googleStatus.value?.providers?.lighthouse?.status === 'connected')
const hasGsc = computed(() => googleStatus.value?.providers?.google_search_console?.status === 'connected')
const hasGbp = computed(() => googleStatus.value?.providers?.google_business_profile?.status === 'connected')
const providerList = getProviderList()

function isProviderConnected(provider: IntegrationProvider): boolean {
  if (provider === 'google_analytics') return !!hasGa.value
  if (provider === 'google_search_console') return !!hasGsc.value
  if (provider === 'lighthouse') return !!hasLighthouse.value
  if (provider === 'google_business_profile') return !!hasGbp.value
  if (provider === 'google_ads') return !!hasAds.value
  if (provider === 'woocommerce') return wooConfigLoaded.value && !!wooConfigured.value
  if (provider === 'bing_webmaster') {
    const int = integrationByProvider(provider)
    const hasKey = int?.config_json && typeof (int.config_json as { api_key?: string }).api_key === 'string' && (int.config_json as { api_key: string }).api_key.trim().length > 0
    return int?.status === 'connected' && !!hasKey
  }
  return false
}

const disconnectedProviders = computed(() => providerList.filter((p) => !isProviderConnected(p)))

// Lighthouse reports (mobile + desktop)
const lighthouseMobile = ref<{ categories?: Record<string, { score?: number }> } | null>(null)
const lighthouseDesktop = ref<{ categories?: Record<string, { score?: number }> } | null>(null)
const lighthouseLoading = ref(false)
const lighthouseCategoriesList = ['performance', 'accessibility', 'best-practices', 'seo'] as const

// WooCommerce sales summary (when integration is configured)
const wooConfigLoaded = ref(false)
const wooConfigured = ref(false)
const wooReport = ref<{
  startDate: string
  endDate: string
  totalRevenue: number
  totalOrders: number
  revenueByDay: Array<{ date: string; value: number }>
} | null>(null)
const wooReportLoading = ref(false)
const wooReportError = ref('')

function formatWooCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)
}

function formatLhCategory(id: string): string {
  if (id === 'best-practices') return 'Best practices'
  return id.charAt(0).toUpperCase() + id.slice(1)
}
function lighthouseScorePct(score: number | undefined): string {
  if (score == null) return '—'
  return Math.round(score * 100).toString()
}
function lighthouseScoreClass(score: number | undefined): string {
  if (score == null) return 'text-surface-400'
  const v = score * 100
  if (v >= 90) return 'text-green-600'
  if (v >= 50) return 'text-amber-600'
  return 'text-red-600'
}

async function loadLighthouseReports() {
  if (!site.value || !hasLighthouse.value) return
  lighthouseLoading.value = true
  try {
    const [mobile, desktop] = await Promise.all([
      $fetch<{ categories?: Record<string, { score?: number }> } | null>('/api/lighthouse/report', {
        query: { siteId: site.value.id, strategy: 'mobile' },
        headers: authHeaders(),
      }).catch(() => null),
      $fetch<{ categories?: Record<string, { score?: number }> } | null>('/api/lighthouse/report', {
        query: { siteId: site.value.id, strategy: 'desktop' },
        headers: authHeaders(),
      }).catch(() => null),
    ])
    lighthouseMobile.value = mobile
    lighthouseDesktop.value = desktop
  } finally {
    lighthouseLoading.value = false
  }
}

async function loadWooConfig() {
  if (!site.value || !integrationByProvider('woocommerce')) {
    wooConfigLoaded.value = true
    wooConfigured.value = false
    return
  }
  wooConfigLoaded.value = false
  try {
    const data = await $fetch<{ configured: boolean }>('/api/woocommerce/config', {
      query: { siteId: site.value.id },
      headers: authHeaders(),
    })
    wooConfigured.value = data.configured
  } catch {
    wooConfigured.value = false
  } finally {
    wooConfigLoaded.value = true
  }
}

async function loadWooReport() {
  if (!site.value || !wooConfigured.value) return
  wooReportError.value = ''
  wooReportLoading.value = true
  const endD = new Date()
  const startD = new Date()
  startD.setDate(startD.getDate() - 30)
  const startDate = startD.toISOString().slice(0, 10)
  const endDate = endD.toISOString().slice(0, 10)
  try {
    const data = await $fetch<typeof wooReport.value>('/api/woocommerce/report', {
      query: { siteId: site.value.id, startDate, endDate },
      headers: authHeaders(),
    })
    wooReport.value = data
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    wooReportError.value = err?.data?.message ?? err?.message ?? 'Failed to load sales report.'
  } finally {
    wooReportLoading.value = false
  }
}

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function integrationByProvider(provider: IntegrationProvider): IntegrationRecord | undefined {
  return integrations.value.find((i) => i.provider === provider)
}

async function loadSite() {
  const s = await getSite(pb, siteId.value)
  site.value = s
}

async function loadIntegrations() {
  if (!site.value) return
  integrations.value = await listIntegrationsBySite(pb, site.value.id)
}

async function loadGoogleStatus() {
  if (!site.value) return
  try {
    googleStatus.value = await getStatus(site.value.id)
  } catch {
    googleStatus.value = null
  }
}

async function loadOtherConnectedSite() {
  if (!site.value || googleStatus.value?.connected) {
    otherConnectedSite.value = null
    return
  }
  try {
    const res = await getOtherConnectedSite(site.value.id)
    if (res.otherSiteId) {
      otherConnectedSite.value = { otherSiteId: res.otherSiteId, otherSiteName: res.otherSiteName }
    } else {
      otherConnectedSite.value = null
    }
  } catch {
    otherConnectedSite.value = null
  }
}

async function refreshIntegrations() {
  await loadIntegrations()
  await loadGoogleStatus()
  await loadOtherConnectedSite()
  await loadWooConfig()
  if (wooConfigured.value) await loadWooReport()
  if (hasLighthouse.value) await loadLighthouseReports()
}

async function init() {
  pending.value = true
  try {
    await loadSite()
    await Promise.all([loadIntegrations(), loadGoogleStatus()])
    await loadOtherConnectedSite()
    await loadWooConfig()
    if (wooConfigured.value) await loadWooReport()
    if (hasLighthouse.value) await loadLighthouseReports()
    if (route.query.google === 'connected') {
      googleConnectedToast.value = true
      if (typeof window !== 'undefined') window.history.replaceState({}, '', `/sites/${siteId.value}`)
      setTimeout(() => { googleConnectedToast.value = false }, 5000)
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
watch(() => route.query.google, () => {
  if (route.query.google === 'connected' && site.value) loadGoogleStatus()
})
</script>
