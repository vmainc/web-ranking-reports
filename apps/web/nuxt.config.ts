import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Nuxt writes `schema/nuxt.schema.{d.ts,json}` without ensuring parents/files exist first.
 * Pre-create dir + minimal stubs so open()/writeFile() never hit ENOENT (dev HMR, prepare, etc.).
 */
function ensureNuxtSchemaDir(buildDir: string) {
  const schemaDir = join(buildDir, 'schema')
  mkdirSync(schemaDir, { recursive: true })
  const dts = join(schemaDir, 'nuxt.schema.d.ts')
  const json = join(schemaDir, 'nuxt.schema.json')
  if (!existsSync(dts)) {
    writeFileSync(dts, '/** Placeholder — replaced by Nuxt. */\nexport {}\n', 'utf8')
  }
  if (!existsSync(json)) {
    writeFileSync(json, '{}\n', 'utf8')
  }
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  hooks: {
    ready(nuxt) {
      ensureNuxtSchemaDir(nuxt.options.buildDir)
    },
  },
  compatibilityDate: '2024-11-01',
  devtools: {
    // Set NUXT_DEVTOOLS=1 or true to enable (Shift+Option+D). Off by default to avoid console noise (style on VueElement, etc.).
    enabled: process.env.NUXT_DEVTOOLS === '1' || process.env.NUXT_DEVTOOLS === 'true',
    componentInspector: false,
  },
  /**
   * Marketing SFCs live under components/marketing/ but are used as <HeroSection>, <Footer>, etc.
   * Default Nuxt would register them as MarketingHeroSection — exclude that folder from the main scan
   * and re-scan it with pathPrefix: false so names match templates.
   */
  components: [
    {
      path: '~/components',
      ignore: ['**/marketing/**'],
    },
    {
      path: '~/components/marketing',
      pathPrefix: false,
    },
  ],
  modules: ['@nuxtjs/tailwindcss'],
  /** Single Tailwind entry: default path is assets/css/tailwind.css (missing here); without this, the module injects node_modules tailwind.css AND nuxt loads main.css → duplicate @tailwind and broken styles in dev. */
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },
  typescript: { strict: true },
  vite: {
    resolve: {
      alias: {
        '#app-manifest': fileURLToPath(new URL('./scripts/vite-app-manifest-stub.mjs', import.meta.url)),
      },
    },
  },
  /** Stripe webhook must verify the raw request body; do not JSON-parse it before signature check. */
  routeRules: {
    '/api/stripe/webhook': { bodyParser: false },
  },
  runtimeConfig: {
    public: {
      pocketbaseUrl: process.env.NUXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090',
      appUrl: process.env.APP_URL || 'http://localhost:3000',
      /** Publishable key only (safe for the browser). */
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
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
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    stripePriceId: process.env.STRIPE_PRICE_ID || '',
  },
  app: {
    head: {
      title: 'Web Ranking Reports',
      meta: [
        {
          name: 'description',
          content:
            'Reporting, CRM, email campaigns, and AI planning for digital marketing agencies. Per-site pricing, 14-day trial.',
        },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap' },
      ],
    },
  },
})
