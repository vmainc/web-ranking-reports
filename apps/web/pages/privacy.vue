<template>
  <div class="border-b border-surface-200 bg-white py-14 sm:py-16">
    <div class="mx-auto max-w-3xl px-4 sm:px-6">
      <h1 class="text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">Privacy Policy</h1>
      <p class="mt-3 text-sm text-surface-500">Last updated: {{ updatedAt }}</p>

      <div class="prose prose-slate mt-8 max-w-none">
        <p>
          Web Ranking Reports is built to help agencies manage reporting and integrations. We do not sell personal data, and we
          do not share your client data with third parties for advertising.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>Account details you provide (name, email, login credentials).</li>
          <li>Site and integration configuration needed to run reports.</li>
          <li>Usage analytics to improve product performance and reliability.</li>
        </ul>

        <h2>Google Analytics usage</h2>
        <p>
          We use Google Analytics for aggregate product analytics (for example: page views, feature usage, and session trends).
          We use this to improve the app and troubleshoot issues.
        </p>
        <p>
          We do not intentionally send sensitive personal information to Google Analytics. We do not store sensitive personal data
          in reporting datasets.
        </p>

        <h2>How your data is used</h2>
        <ul>
          <li>To provide dashboards, integrations, and scheduled reports.</li>
          <li>To secure accounts, prevent abuse, and maintain service health.</li>
          <li>To support customers and resolve technical issues.</li>
        </ul>

        <h2>Data sharing</h2>
        <p>
          We do not sell your data. We only share data with service providers required to operate the platform (such as hosting,
          infrastructure, and analytics providers), and only for service delivery.
        </p>

        <h2>Data retention and security</h2>
        <p>
          We keep data only as long as needed to operate the service and meet legal obligations. We use reasonable technical and
          organizational safeguards to protect data in transit and at rest.
        </p>

        <h2>Your choices</h2>
        <ul>
          <li>You can disconnect integrations at any time from your settings.</li>
          <li>You can request account/data deletion by contacting us.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          For privacy questions or deletion requests, contact:
          <a href="mailto:support@webrankingreports.com">support@webrankingreports.com</a>
        </p>
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

