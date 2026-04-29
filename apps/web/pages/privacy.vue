<template>
  <div class="border-b border-surface-200 bg-gradient-to-b from-surface-50 to-white py-14 sm:py-16">
    <div class="mx-auto max-w-4xl px-4 sm:px-6">
      <div class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm sm:p-8">
        <p class="text-xs font-semibold uppercase tracking-wide text-primary-700">Policy</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">Privacy Policy</h1>
        <p class="mt-2 text-sm text-surface-500">Last updated: {{ updatedAt }}</p>
        <p class="mt-5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm leading-relaxed text-primary-900">
          Web Ranking Reports is built to help agencies manage reporting and integrations. We do not sell personal data, and we
          do not share your client data with third parties for advertising.
        </p>
      </div>

      <div class="mt-6 space-y-4">
        <section class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm sm:p-7">
          <h2 class="text-lg font-semibold text-surface-900">What we collect</h2>
          <ul class="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-surface-700">
            <li>Account details you provide (name, email, login credentials).</li>
            <li>Site and integration configuration needed to run reports.</li>
            <li>Usage analytics to improve product performance and reliability.</li>
          </ul>
        </section>

        <section class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm sm:p-7">
          <h2 class="text-lg font-semibold text-surface-900">Google Analytics usage</h2>
          <p class="mt-3 text-sm leading-relaxed text-surface-700">
            We use Google Analytics for aggregate product analytics (for example: page views, feature usage, and session trends).
            We use this to improve the app and troubleshoot issues.
          </p>
          <p class="mt-3 text-sm leading-relaxed text-surface-700">
            We do not intentionally send sensitive personal information to Google Analytics. We do not store sensitive personal data
            in reporting datasets.
          </p>
        </section>

        <section class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm sm:p-7">
          <h2 class="text-lg font-semibold text-surface-900">How your data is used</h2>
          <ul class="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-surface-700">
            <li>To provide dashboards, integrations, and scheduled reports.</li>
            <li>To secure accounts, prevent abuse, and maintain service health.</li>
            <li>To support customers and resolve technical issues.</li>
          </ul>
        </section>

        <section class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm sm:p-7">
          <h2 class="text-lg font-semibold text-surface-900">Data sharing</h2>
          <p class="mt-3 text-sm leading-relaxed text-surface-700">
            We do not sell your data. We only share data with service providers required to operate the platform (such as hosting,
            infrastructure, and analytics providers), and only for service delivery.
          </p>
        </section>

        <section class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm sm:p-7">
          <h2 class="text-lg font-semibold text-surface-900">Data retention and security</h2>
          <p class="mt-3 text-sm leading-relaxed text-surface-700">
            We keep data only as long as needed to operate the service and meet legal obligations. We use reasonable technical and
            organizational safeguards to protect data in transit and at rest.
          </p>
        </section>

        <section class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm sm:p-7">
          <h2 class="text-lg font-semibold text-surface-900">Your choices</h2>
          <ul class="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-surface-700">
            <li>You can disconnect integrations at any time from your settings.</li>
            <li>You can request account/data deletion by contacting us.</li>
          </ul>
        </section>

        <section class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm sm:p-7">
          <h2 class="text-lg font-semibold text-surface-900">Contact</h2>
          <p class="mt-3 text-sm leading-relaxed text-surface-700">
            For privacy questions or deletion requests, contact
            <a href="mailto:support@webrankingreports.com" class="font-medium text-primary-700 underline">support@webrankingreports.com</a>.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const updatedAt = 'April 29, 2026'

useSeoMeta({
  title: 'Privacy Policy — Web Ranking Reports',
  description:
    'Web Ranking Reports privacy policy. We do not sell your data, and we use Google Analytics for aggregate product analytics without storing sensitive personal data in reports.',
})
</script>

