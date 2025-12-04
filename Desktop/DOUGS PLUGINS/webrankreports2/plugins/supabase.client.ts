import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseAnonKey
  
  // Fail loudly if env vars are missing
  if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = []
    if (!supabaseUrl) missingVars.push('SUPABASE_URL')
    if (!supabaseAnonKey) missingVars.push('SUPABASE_ANON_KEY')
    
    const errorMsg = `❌ CRITICAL: Supabase is misconfigured. Missing environment variables: ${missingVars.join(', ')}. Please set these in your Netlify environment variables (Site settings > Environment variables).`
    
    console.error('='.repeat(80))
    console.error(errorMsg)
    console.error('='.repeat(80))
    
    // In production, throw an error to prevent silent failures
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Supabase configuration error: Missing ${missingVars.join(', ')}. Check Netlify environment variables.`)
    }
    
    // In dev, return null client so downstream code can check for it
    return {
      provide: {
        supabase: null
      }
    }
  }
  
  const supabaseOptions: any = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    }
  }
  
  // Handle SSR - pass cookies from request headers
  if (process.server) {
    const event = useRequestEvent()
    if (event?.node?.req?.headers?.cookie) {
      supabaseOptions.global = {
        headers: {
          cookie: event.node.req.headers.cookie
        }
      }
    }
  }
  
  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    supabaseOptions
  )
  
  return {
    provide: {
      supabase
    }
  }
})

