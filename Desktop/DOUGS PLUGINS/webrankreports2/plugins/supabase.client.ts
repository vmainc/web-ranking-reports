import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseAnonKey
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.')
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
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    supabaseOptions
  )
  
  return {
    provide: {
      supabase
    }
  }
})

