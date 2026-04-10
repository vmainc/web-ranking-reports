// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: {
    // Set NUXT_DEVTOOLS=1 or true to enable (Shift+Option+D). Off by default to avoid console noise (style on VueElement, etc.).
    enabled: process.env.NUXT_DEVTOOLS === '1' || process.env.NUXT_DEVTOOLS === 'true',
    componentInspector: false,
  },
  modules: ['@nuxtjs/tailwindcss'],
  typescript: { strict: true },
  runtimeConfig: {
    public: {
      pocketbaseUrl: process.env.NUXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090',
      appUrl: process.env.APP_URL || 'http://localhost:3000',
      /** Set to false to hide WooCommerce integration and reports everywhere. */
      woocommerceEnabled: process.env.NUXT_PUBLIC_WOOCOMMERCE_ENABLED !== 'false',
    },
    pbUrl: '',
    pbAdminEmail: process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL || '',
    pbAdminPassword: process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || '',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    stateSigningSecret: process.env.STATE_SIGNING_SECRET || '',
    /** Optional; defaults to stateSigningSecret. Used to sign team-invite “set password” links (single email flow). */
    invitePasswordTokenSecret: process.env.INVITE_PASSWORD_TOKEN_SECRET || '',
    adminEmails: (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e: string) => e.trim())
      .filter(Boolean),
    pagespeedApiKey: process.env.PAGESPEED_API_KEY || '',
  },
  app: {
    head: {
      title: 'Web Ranking Reports',
      meta: [
        { name: 'description', content: 'Track and report on your site rankings and integrations.' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap' },
      ],
    },
  },
  css: ['~/assets/css/main.css'],
})
