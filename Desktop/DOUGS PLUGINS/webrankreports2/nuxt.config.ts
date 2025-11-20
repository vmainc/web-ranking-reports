// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-01-01',
  devtools: { enabled: true },
  
  modules: ['@nuxtjs/tailwindcss'],
  
  css: ['~/assets/css/main.css'],
  
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
    }
  },
  
  nitro: {
    preset: 'netlify',
    rollupOptions: {
      external: ['@netlify/functions']
    }
  },
  
  ssr: true
})

