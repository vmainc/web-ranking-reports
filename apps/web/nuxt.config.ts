import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

/**
 * Schema dir + stubs: see `modules/wrr-ensure-nuxt-schema-paths.ts` (runs at `schema:beforeWrite` / `build:before`).
 * `ready` in nuxt.config was too late — Nuxt writes `nuxt.schema.json` at `build:done` first.
 */

/** Vite writes `.nuxt/dist/server/server.mjs` without mkdir; ensure dirs exist on every dev bundle. */
function ensureNuxtDistDirs(buildDir: string) {
  mkdirSync(join(buildDir, 'dist', 'server'), { recursive: true })
  mkdirSync(join(buildDir, 'dist', 'client'), { recursive: true })
}

const projectRoot = dirname(fileURLToPath(import.meta.url))
const defaultNuxtBuildDir = join(projectRoot, '.nuxt')

function viteEnsureNuxtDistDirsPlugin(buildDir: string): Plugin {
  return {
    name: 'wrr-ensure-nuxt-dist-dirs',
    buildStart() {
      ensureNuxtDistDirs(buildDir)
    },
  }
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  /** Listen on all interfaces (string required — `true` breaks Node’s `server.listen` with listhen). */
  devServer: {
    host: '0.0.0.0',
  },
  /**
   * Chunk load errors: `'automatic-immediate'` reloads the *current* route as soon as any chunk
   * fails — in dev (HMR / `.nuxt` regen) that can fire while styles are mid-flight and leave you on
   * a permanently unstyled page. Use `'automatic'` so reload tracks navigation, or `false` to
   * disable. After deploy, use a normal refresh if tabs look broken.
   */
  experimental: {
    emitRouteChunkError: 'automatic',
  },
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
  modules: ['./modules/wrr-ensure-nuxt-schema-paths', '@nuxtjs/tailwindcss'],
  /** Single Tailwind entry: default path is assets/css/tailwind.css (missing here); without this, the module injects node_modules tailwind.css AND nuxt loads main.css → duplicate @tailwind and broken styles in dev. */
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },
  typescript: { strict: true },
  vite: {
    server: {
      /** Fail fast if port 3000 is taken instead of silently serving a different app/build. */
      strictPort: true,
    },
    plugins: [viteEnsureNuxtDistDirsPlugin(defaultNuxtBuildDir)],
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
      /** Runtime override in Docker: set NUXT_PUBLIC_APP_URL (see infra/docker-compose.yml). */
      appUrl: process.env.NUXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000',
      /** Publishable key only (safe for the browser). */
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      /** Set to false to hide WooCommerce integration and reports everywhere. */
      woocommerceEnabled: process.env.NUXT_PUBLIC_WOOCOMMERCE_ENABLED !== 'false',
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '',
    },
    pbUrl: '',
    pbAdminEmail: process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL || '',
    pbAdminPassword: process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || '',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    stateSigningSecret: process.env.NUXT_STATE_SIGNING_SECRET || process.env.STATE_SIGNING_SECRET || '',
    /** Optional; defaults to stateSigningSecret. Used to sign team-invite “set password” links (single email flow). */
    invitePasswordTokenSecret: process.env.INVITE_PASSWORD_TOKEN_SECRET || '',
    adminEmails: (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e: string) => e.trim())
      .filter(Boolean),
    pagespeedApiKey: process.env.PAGESPEED_API_KEY || '',
    stripeMode: process.env.STRIPE_MODE || '',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    stripePriceId: process.env.STRIPE_PRICE_ID || '',
    stripePriceStarter: process.env.STRIPE_PRICE_STARTER || '',
    stripePriceGrowth: process.env.STRIPE_PRICE_GROWTH || '',
    stripePriceAgency: process.env.STRIPE_PRICE_AGENCY || '',
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '',
    /** Google OAuth client for agency Gmail send (server-only; not the Analytics OAuth in app_settings). */
    googleEmailClientId: process.env.GOOGLE_CLIENT_ID || process.env.NUXT_GOOGLE_CLIENT_ID || '',
    googleEmailClientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.NUXT_GOOGLE_CLIENT_SECRET || '',
    googleEmailOauthRedirectUri:
      process.env.GOOGLE_OAUTH_REDIRECT_URI || process.env.NUXT_GOOGLE_OAUTH_REDIRECT_URI || '',
    /** AES-256 key material for encrypting agency email OAuth tokens at rest. */
    emailCredentialsEncryptionKey:
      process.env.EMAIL_CREDENTIALS_ENCRYPTION_KEY || process.env.NUXT_EMAIL_CREDENTIALS_ENCRYPTION_KEY || '',
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
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Inter:wght@400;500;600;700;800&display=swap',
        },
      ],
      script: [
        {
          children:
            "(function(){try{var t=localStorage.getItem('wrr-app-theme');var r=document.documentElement;r.classList.remove('app-theme-light','app-theme-dark','app-light','app-dark');if(t==='light'){r.classList.add('app-theme-light');document.body.classList.add('bg-surface-50','text-surface-800');}else{r.classList.add('app-theme-dark');}}catch(e){}})();",
        },
        {
          children:
            "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-K93Q3HB6');",
        },
      ],
      /** Outside Vue tree — avoids hydration mismatch from `<noscript><iframe>` in app.vue. */
      noscript: [
        {
          innerHTML:
            '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K93Q3HB6" height="0" width="0" style="display:none;visibility:hidden"></iframe>',
          tagPosition: 'bodyClose',
        },
      ],
    },
  },
})
