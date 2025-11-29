// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-01-01',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  
  modules: ['@nuxtjs/tailwindcss'],
  
  css: ['~/assets/css/main.css'],
  
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
      supabaseFunctionsUrl: process.env.SUPABASE_FUNCTIONS_URL || 
        (process.env.SUPABASE_URL 
          ? `${process.env.SUPABASE_URL.replace('.supabase.co', '')}.functions.supabase.co/functions/v1`
          : ''),
      // App URL for OAuth redirects
      appUrl: process.env.WEBRANKINGREPORTS_APP_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://app.webrankingreports.com' 
          : 'http://localhost:3000'),
    },
    // Private runtime config (server-side only)
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googlePageSpeedApiKey: process.env.GOOGLE_PAGESPEED_API_KEY || '',
    claudeApiKey: process.env.CLAUDE_API_KEY || '',
  },
  
  vite: {
    root: process.cwd(),
    resolve: {
      alias: {}
    },
    server: {
      fs: {
        strict: true,
        allow: [process.cwd()]
      },
      // Allow Netlify preview domains in dev mode
      host: true,
      hmr: {
        clientPort: 443,
        protocol: 'wss'
      }
    }
  },
  
  typescript: {
    tsconfig: {
      extends: './tsconfig.json'
    }
  },
  
  nitro: {
    preset: 'netlify',
    externals: {
      external: ['@netlify/functions']
    }
  },
  
  ssr: true
})

