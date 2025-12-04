<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      <div class="bg-white shadow rounded-lg p-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">Supabase Configuration Diagnostic</h1>
        
        <div class="space-y-6">
          <!-- Configuration Status -->
          <div class="border-b border-gray-200 pb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Configuration Status</h2>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700">Supabase URL:</span>
                <span :class="configStatus.url ? 'text-green-600' : 'text-red-600'">
                  {{ configStatus.url ? '✅ Configured' : '❌ Not Configured' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700">Supabase Anon Key:</span>
                <span :class="configStatus.anonKey ? 'text-green-600' : 'text-red-600'">
                  {{ configStatus.anonKey ? '✅ Configured' : '❌ Not Configured' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700">Supabase Client:</span>
                <span :class="configStatus.client ? 'text-green-600' : 'text-red-600'">
                  {{ configStatus.client ? '✅ Available' : '❌ Not Available' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Auth Status -->
          <div class="border-b border-gray-200 pb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Authentication Status</h2>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700">Session:</span>
                <span :class="authStatus.session ? 'text-green-600' : 'text-red-600'">
                  {{ authStatus.session ? '✅ Present' : '❌ Missing' }}
                </span>
              </div>
              <div v-if="authStatus.userId" class="text-sm text-gray-600">
                User ID: <code class="bg-gray-100 px-2 py-1 rounded">{{ authStatus.userId }}</code>
              </div>
              <div v-if="authStatus.error" class="text-sm text-red-600">
                Error: {{ authStatus.error }}
              </div>
            </div>
          </div>

          <!-- Database Test -->
          <div class="border-b border-gray-200 pb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Database Test</h2>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700">Sites Table Query:</span>
                <span :class="dbStatus.success ? 'text-green-600' : dbStatus.error ? 'text-red-600' : 'text-yellow-600'">
                  {{ dbStatus.success ? '✅ Success' : dbStatus.error ? '❌ Failed' : '⏳ Not Tested' }}
                </span>
              </div>
              <div v-if="dbStatus.error" class="text-sm text-red-600 bg-red-50 p-3 rounded">
                {{ dbStatus.error }}
              </div>
              <div v-if="dbStatus.count !== null" class="text-sm text-gray-600">
                Sites found: {{ dbStatus.count }}
              </div>
              <button
                @click="testDatabase"
                :disabled="loading || !configStatus.client"
                class="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {{ loading ? 'Testing...' : 'Test Database Connection' }}
              </button>
            </div>
          </div>

          <!-- Instructions -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-blue-900 mb-2">Troubleshooting</h3>
            <ul class="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li v-if="!configStatus.url || !configStatus.anonKey">
                Set <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> in Netlify environment variables
              </li>
              <li v-if="!authStatus.session">
                Make sure you are logged in. Try logging out and back in.
              </li>
              <li v-if="dbStatus.error && dbStatus.error.includes('relation')">
                The <code>sites</code> table may not exist. Run the SQL from <code>supabase/schema/sites.sql</code> in Supabase SQL Editor.
              </li>
              <li v-if="dbStatus.error && dbStatus.error.includes('permission')">
                Check Row Level Security (RLS) policies. They should allow authenticated users to SELECT from <code>sites</code>.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: false
})

const nuxtApp = useNuxtApp()
const $supabase = nuxtApp.$supabase
const config = useRuntimeConfig()

const loading = ref(false)
const configStatus = ref({
  url: false,
  anonKey: false,
  client: false
})
const authStatus = ref({
  session: false,
  userId: null as string | null,
  error: null as string | null
})
const dbStatus = ref({
  success: false,
  error: null as string | null,
  count: null as number | null
})

// Check configuration
onMounted(() => {
  // Check if env vars are present (don't log the actual values)
  configStatus.value.url = !!config.public.supabaseUrl && config.public.supabaseUrl.length > 0
  configStatus.value.anonKey = !!config.public.supabaseAnonKey && config.public.supabaseAnonKey.length > 0
  configStatus.value.client = $supabase !== null && $supabase !== undefined

  // Check auth session
  checkAuth()

  // Log to console for debugging (but don't expose sensitive data)
  console.log('[debug/supabase] Configuration check:')
  console.log('  - Supabase URL configured:', configStatus.value.url)
  console.log('  - Supabase Anon Key configured:', configStatus.value.anonKey)
  console.log('  - Supabase Client available:', configStatus.value.client)
})

const checkAuth = async () => {
  if (!$supabase) {
    authStatus.value.error = 'Supabase client not available'
    return
  }

  try {
    const { data: { session }, error } = await $supabase.auth.getSession()
    
    if (error) {
      authStatus.value.error = error.message
      console.error('[debug/supabase] Session error:', error)
      return
    }

    if (session) {
      authStatus.value.session = true
      authStatus.value.userId = session.user.id
      console.log('[debug/supabase] Session found, user ID:', session.user.id)
    } else {
      authStatus.value.error = 'No session found'
      console.warn('[debug/supabase] No session found')
    }
  } catch (err: any) {
    authStatus.value.error = err.message || 'Unknown error'
    console.error('[debug/supabase] Auth check failed:', err)
  }
}

const testDatabase = async () => {
  if (!$supabase) {
    dbStatus.value.error = 'Supabase client not available'
    return
  }

  loading.value = true
  dbStatus.value.success = false
  dbStatus.value.error = null
  dbStatus.value.count = null

  try {
    console.log('[debug/supabase] Testing database connection...')
    
    const { data, error } = await $supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })

    if (error) {
      dbStatus.value.error = error.message
      console.error('[debug/supabase] Database test error:', error)
      console.error('[debug/supabase] Error code:', error.code)
      
      // Provide helpful error messages
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        dbStatus.value.error = 'Table "sites" does not exist. Run the SQL from supabase/schema/sites.sql in Supabase SQL Editor.'
      } else if (error.code === '42501' || error.message?.includes('permission denied')) {
        dbStatus.value.error = 'Permission denied. Check Row Level Security (RLS) policies for the "sites" table.'
      }
    } else {
      dbStatus.value.success = true
      dbStatus.value.count = data?.length || 0
      console.log('[debug/supabase] Database test successful, sites count:', dbStatus.value.count)
    }
  } catch (err: any) {
    dbStatus.value.error = err.message || 'Unknown error'
    console.error('[debug/supabase] Database test failed:', err)
  } finally {
    loading.value = false
  }
}
</script>

