<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header with Navigation -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <!-- Left: Logo -->
          <div class="flex items-center space-x-4">
            <NuxtLink to="/dashboard" class="flex items-center space-x-2">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="32" width="6" height="8" rx="2" fill="#F97316"/>
                <rect x="16" y="24" width="6" height="16" rx="2" fill="#14B8A6"/>
                <rect x="24" y="12" width="6" height="28" rx="2" fill="#3B82F6"/>
                <path d="M6 36 Q18 20 30 14" stroke="#EC4899" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                <path d="M28 12 L32 16 L28 20" stroke="#EC4899" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">WebRanking</h1>
                <p class="text-sm text-gray-600 -mt-1">Reports</p>
              </div>
            </NuxtLink>
          </div>

          <!-- Right: Navigation Links -->
          <div class="flex items-center space-x-4">
            <NuxtLink
              to="/dashboard"
              class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </NuxtLink>
            <NuxtLink
              to="/sites"
              class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Sites
            </NuxtLink>
            <NuxtLink
              to="/integrations"
              class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Integrations
            </NuxtLink>
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <span class="text-white text-sm font-medium">{{ userInitials }}</span>
              </div>
              <button
                @click="handleLogout"
                class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Sites</h1>
          <p class="text-gray-600 mt-2">Manage and monitor your website rankings</p>
        </div>
        <div class="flex items-center gap-4">
          <button 
            id="add-site-button-main"
            data-add-site-button
            @click.prevent="openAddModal"
            onclick="try{const m=document.getElementById('add-site-modal');if(m){m.style.display='flex';m.style.visibility='visible';m.style.opacity='1';console.log('Modal shown via onclick');}else{console.error('Modal not found');}}catch(e){console.error('onclick error:',e);}return false;"
            class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium cursor-pointer transition-colors"
            type="button"
            :disabled="loading"
          >
            Add Site
          </button>
        </div>
      </div>
      
      <!-- Sites List -->
      <div v-if="sites.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="site in sites" 
          :key="site.id"
          class="bg-white shadow rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
          @click="navigateTo(`/sites/${site.id}/dashboard`)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900">{{ site.name }}</h3>
              <p class="text-sm text-gray-600 mt-1">{{ site.url }}</p>
            </div>
            <button
              @click.stop="deleteSite(site.id)"
              class="text-red-600 hover:text-red-700 ml-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div class="mt-4 flex items-center text-sm text-gray-500">
            <span>Keywords: {{ site.keyword_count || 0 }}</span>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else class="bg-white shadow rounded-lg overflow-hidden">
        <div class="p-12 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No sites yet</h3>
          <p class="mt-1 text-sm text-gray-500">Get started by adding your first website to track rankings.</p>
          <div class="mt-6">
            <button 
              id="add-site-button-empty"
              data-add-site-button
              @click.prevent="openAddModal"
              onclick="try{const m=document.getElementById('add-site-modal');if(m){m.style.display='flex';m.style.visibility='visible';m.style.opacity='1';console.log('Modal shown via onclick');}else{console.error('Modal not found');}}catch(e){console.error('onclick error:',e);}return false;"
              type="button"
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add Your First Site
            </button>
          </div>
        </div>
      </div>

      <!-- Add Site Modal -->
      <div 
        v-show="showAddModal"
        class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-start justify-center pt-20"
        @click.self="closeModal"
        style="z-index: 9999;"
        id="add-site-modal"
      >
        <div 
          class="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white"
          @click.stop
        >
          <div class="mt-3">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">Add New Site</h3>
              <button 
                @click="closeModal"
                type="button"
                class="text-gray-400 hover:text-gray-600"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form @submit.prevent="handleAddSite" class="space-y-4">
              <div>
                <label for="siteName" class="block text-sm font-medium text-gray-700 mb-1">
                  Site Name
                </label>
                <input
                  id="siteName"
                  v-model="newSite.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="My Website"
                />
              </div>
              
              <div>
                <label for="siteUrl" class="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  id="siteUrl"
                  v-model="newSite.url"
                  type="url"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://example.com"
                />
              </div>

              <div v-if="error" class="text-red-600 text-sm">
                {{ error }}
              </div>

              <div class="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  @click="closeModal"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="loading"
                  class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="loading">Adding...</span>
                  <span v-else>Add Site</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: false
})

const nuxtApp = useNuxtApp()
const $supabase = nuxtApp.$supabase

const { userInitials, fetchUserInitials, handleLogout } = useAuth()

const showAddModal = ref(false)
const sites = ref<any[]>([])
const loading = ref(false)
const error = ref('')

const newSite = ref({
  name: '',
  url: ''
})

// Close modal function
const closeModal = () => {
  try {
    showAddModal.value = false
    error.value = ''
    newSite.value = { name: '', url: '' }
    
    // Also hide via DOM as fallback (only on client)
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const modal = document.getElementById('add-site-modal')
        if (modal) {
          modal.style.display = 'none'
        }
      } catch (e) {
        // Ignore DOM errors
      }
    }
  } catch (err) {
    console.error('[closeModal] Error:', err)
  }
}

// Direct DOM manipulation function as ultimate fallback
const openAddModalDirect = () => {
  // Only run on client side
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('[openAddModalDirect] Running on server, skipping')
    return
  }
  
  console.log('[openAddModalDirect] Direct DOM function called')
  try {
    // Try Vue way first
    if (showAddModal && typeof showAddModal.value !== 'undefined') {
      showAddModal.value = true
      console.log('[openAddModalDirect] Vue reactivity worked, showAddModal set to true')
      // Double-check it actually worked
      setTimeout(() => {
        try {
          const modal = document.getElementById('add-site-modal')
          if (modal && window.getComputedStyle(modal).display === 'none') {
            console.log('[openAddModalDirect] Vue reactivity failed, forcing DOM display')
            modal.style.display = 'flex'
            modal.style.visibility = 'visible'
          }
        } catch (e) {
          // Ignore DOM errors
        }
      }, 50)
      return
    }
    
    // Fallback: Direct DOM manipulation
    const modal = document.getElementById('add-site-modal')
    if (modal) {
      modal.style.display = 'flex'
      modal.style.visibility = 'visible'
      // Remove any inline styles that might hide it
      modal.removeAttribute('hidden')
      console.log('[openAddModalDirect] Modal shown via direct DOM manipulation')
      
      // Also try to set Vue ref if possible
      if (showAddModal) {
        try {
          showAddModal.value = true
        } catch (e) {
          console.log('[openAddModalDirect] Could not set Vue ref, but modal is visible')
        }
      }
    } else {
      console.error('[openAddModalDirect] Modal element not found in DOM')
      if (typeof alert !== 'undefined') {
        alert('Modal element not found. The page may not have loaded correctly. Please refresh.')
      }
    }
  } catch (err) {
    console.error('[openAddModalDirect] Error:', err)
    if (typeof alert !== 'undefined') {
      alert('Error opening modal. Please check console and refresh.')
    }
  }
}

// Simple direct modal show function (works independently of Vue)
const showModalDirect = () => {
  // Only run on client side
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('[showModalDirect] Running on server, skipping')
    return false
  }
  
  console.log('[showModalDirect] Called')
  try {
    const modal = document.getElementById('add-site-modal')
    if (modal) {
      modal.style.display = 'flex'
      modal.style.visibility = 'visible'
      modal.style.opacity = '1'
      console.log('[showModalDirect] Modal shown via direct DOM')
      return true
    } else {
      console.error('[showModalDirect] Modal not found')
      return false
    }
  } catch (err) {
    console.error('[showModalDirect] Error:', err)
    return false
  }
}

// Test function - expose immediately
const testAddSiteModal = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('[testAddSiteModal] Running on server')
    return false
  }
  
  console.log('[testAddSiteModal] Testing modal...')
  const modal = document.getElementById('add-site-modal')
  const buttons = document.querySelectorAll('[data-add-site-button], #add-site-button-main, #add-site-button-empty')
  console.log('[testAddSiteModal] Modal exists:', !!modal)
  console.log('[testAddSiteModal] Buttons found:', buttons.length)
  
  if (modal) {
    modal.style.display = 'flex'
    modal.style.visibility = 'visible'
    modal.style.opacity = '1'
    console.log('[testAddSiteModal] ✅ Modal should be visible now')
    return true
  }
  console.error('[testAddSiteModal] ❌ Modal not found')
  return false
}

// Expose functions - use multiple methods to ensure it works
const exposeFunctions = () => {
  if (typeof window === 'undefined') return
  
  try {
    const win = window as any
    
    // Method 1: Direct assignment
    win.showAddSiteModal = showModalDirect
    win.testAddSiteModal = testAddSiteModal
    win.openAddModalDirect = openAddModalDirect
    win.debugOpenAddModal = openAddModal
    
    // Method 2: Object.assign
    Object.assign(win, {
      showAddSiteModal: showModalDirect,
      testAddSiteModal: testAddSiteModal,
      openAddModalDirect: openAddModalDirect,
      debugOpenAddModal: openAddModal
    })
    
    // Method 3: Define property (more reliable)
    try {
      Object.defineProperty(win, 'showAddSiteModal', {
        value: showModalDirect,
        writable: true,
        configurable: true
      })
      Object.defineProperty(win, 'testAddSiteModal', {
        value: testAddSiteModal,
        writable: true,
        configurable: true
      })
    } catch (e) {
      // Ignore defineProperty errors
    }
    
    console.log('[exposeFunctions] Functions exposed')
    console.log('[exposeFunctions] typeof window.testAddSiteModal:', typeof win.testAddSiteModal)
    console.log('[exposeFunctions] typeof window.showAddSiteModal:', typeof win.showAddSiteModal)
  } catch (err) {
    console.error('[exposeFunctions] Error:', err)
  }
}

// Try to expose immediately
if (typeof window !== 'undefined') {
  exposeFunctions()
  
  // Also try after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', exposeFunctions)
  } else {
    // DOM already ready, expose now
    setTimeout(exposeFunctions, 0)
  }
  
  // Also expose after a delay
  setTimeout(exposeFunctions, 100)
  setTimeout(exposeFunctions, 500)
}

// Fetch sites on mount
onMounted(async () => {
  try {
    // Only run on client side
    if (typeof window === 'undefined') {
      console.warn('[onMounted] Running on server, skipping')
      return
    }
    
    console.log('[onMounted] Starting...')
    
    try {
      await fetchUserInitials()
    } catch (err) {
      console.error('[onMounted] Error in fetchUserInitials:', err)
    }
    
    try {
      await fetchSites()
    } catch (err) {
      console.error('[onMounted] Error in fetchSites:', err)
    }
    
    console.log('[onMounted] Page mounted, showAddModal initial value:', showAddModal.value)
  
    // Expose functions globally (definitely runs on client)
    console.log('[onMounted] Exposing functions...')
    exposeFunctions()
    
    // Verify it worked
    const win = window as any
    if (typeof win.testAddSiteModal === 'function') {
      console.log('[onMounted] ✅ testAddSiteModal is a function')
    } else {
      console.error('[onMounted] ❌ testAddSiteModal is NOT a function, type:', typeof win.testAddSiteModal)
      // Try one more time
      exposeFunctions()
    }
  
  // Verify modal exists
  try {
    const modal = document.getElementById('add-site-modal')
    console.log('[onMounted] Modal element exists:', !!modal)
    
    // Immediate check for modal existence
    const checkModal = () => {
      const modalEl = document.getElementById('add-site-modal')
      if (modalEl) {
        console.log('[onMounted] Modal element found in DOM')
      } else {
        console.warn('[onMounted] Modal element NOT found in DOM yet')
      }
    }
    
    checkModal()
    setTimeout(checkModal, 1000)
    setTimeout(checkModal, 3000)
  } catch (err) {
    console.error('[onMounted] Error checking modal:', err)
  }
    
    // Add aggressive event listeners as fallback
    const setupListeners = () => {
      const addSiteButtons = document.querySelectorAll('[data-add-site-button], #add-site-button-main, #add-site-button-empty')
      console.log(`[setupListeners] Found ${addSiteButtons.length} buttons`)
      
      addSiteButtons.forEach((button, index) => {
        const btn = button as HTMLElement
        if (btn && !btn.dataset.listenerAdded) {
          console.log(`[setupListeners] Setting up button ${index}:`, btn.id || btn.className)
          
          // Add click listener WITHOUT cloning (to preserve onclick)
          const clickHandler = (e: Event) => {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            console.log(`[setupListeners] Button ${index} clicked via addEventListener`)
            
            // Immediately show modal via DOM
            const modal = document.getElementById('add-site-modal')
            if (modal) {
              modal.style.display = 'flex'
              modal.style.visibility = 'visible'
              modal.style.opacity = '1'
              console.log('[setupListeners] Modal shown directly')
            }
            
            // Also try Vue
            try {
              openAddModal()
            } catch (err) {
              console.error('[setupListeners] Vue openAddModal failed:', err)
            }
            
            // Also try direct function
            try {
              showModalDirect()
            } catch (err) {
              console.error('[setupListeners] showModalDirect failed:', err)
            }
          }
          
          // Add listener with capture to catch early
          btn.addEventListener('click', clickHandler, true)
          btn.addEventListener('click', clickHandler, false)
          
          btn.dataset.listenerAdded = 'true'
          console.log(`[setupListeners] ✅ Listener added to button ${index}`)
        }
      })
    }
    
    // Setup immediately
    setupListeners()
    
    // Setup again after delays
    setTimeout(setupListeners, 100)
    setTimeout(setupListeners, 500)
    setTimeout(setupListeners, 1000)
    setTimeout(setupListeners, 2000)
    
    // Test after a delay
    setTimeout(() => {
      console.log('[onMounted] Running test...')
      testAddSiteModal()
    }, 1500)
  } catch (err) {
    console.error('[onMounted] Fatal error in onMounted:', err)
    // Even if everything fails, try to at least expose the function
    try {
      if (typeof window !== 'undefined') {
        const win = window as any
        win.showAddSiteModal = showModalDirect
        console.log('[onMounted] Function exposed in error handler')
      }
    } catch (e) {
      console.error('[onMounted] Could not expose function in error handler:', e)
    }
  }
})

const openAddModal = () => {
  console.log('[openAddModal] Function called')
  try {
    // Clear any previous errors and reset form
    error.value = ''
    newSite.value = { name: '', url: '' }
    
    // Set modal to visible
    showAddModal.value = true
    
    console.log('[openAddModal] Modal state set to true')
    
    // Verify it worked
    nextTick(() => {
      if (showAddModal.value) {
        console.log('[openAddModal] Modal is now visible')
      } else {
        console.error('[openAddModal] Modal state failed to set, trying direct DOM')
        // Fallback to direct DOM if Vue reactivity failed
        setTimeout(() => openAddModalDirect(), 50)
      }
    })
  } catch (err) {
    console.error('[openAddModal] Error:', err)
    // Fallback to direct DOM manipulation
    openAddModalDirect()
  }
}

const fetchSites = async () => {
  if (!$supabase) return
  
  try {
    const { data: { session } } = await $supabase.auth.getSession()
    if (!session) return

    const { data, error: fetchError } = await $supabase
      .from('sites')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching sites:', fetchError)
      // If table doesn't exist, sites will be empty (expected for new setup)
      sites.value = []
    } else {
      sites.value = data || []
    }
  } catch (err) {
    console.error('Failed to fetch sites:', err)
    sites.value = []
  }
}

const handleAddSite = async () => {
  console.log('handleAddSite called')
  
  if (!$supabase) {
    console.error('Supabase client not available')
    error.value = 'Supabase is not configured. Please check your environment variables.'
    return
  }

  error.value = ''
  loading.value = true

  try {
    console.log('Getting session...')
    const { data: { session }, error: sessionError } = await $supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      error.value = 'Authentication error: ' + sessionError.message
      loading.value = false
      return
    }
    
    if (!session) {
      console.error('No session found')
      error.value = 'You must be logged in to add sites'
      loading.value = false
      return
    }

    console.log('Session found, user ID:', session.user.id)

    // Normalize URL
    let url = newSite.value.url.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    console.log('Inserting site:', { name: newSite.value.name.trim(), url, user_id: session.user.id })

    const { data, error: insertError } = await $supabase
      .from('sites')
      .insert([
        {
          name: newSite.value.name.trim(),
          url: url,
          user_id: session.user.id
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      // If table doesn't exist, show helpful message
      if (insertError.code === '42P01' || insertError.message.includes('relation') || insertError.message.includes('does not exist')) {
        error.value = 'Database table not set up. Please create a "sites" table in Supabase with columns: id, name, url, user_id, created_at'
      } else {
        error.value = insertError.message || 'Failed to add site'
      }
      loading.value = false
      return
    }

    console.log('Site added successfully:', data)

    // Success - reset form and refresh list
    newSite.value = { name: '', url: '' }
    showAddModal.value = false
    await fetchSites()

    // Note: Automatic audits can be triggered separately if needed
    // This endpoint doesn't exist yet, so we skip it for now
  } catch (err: any) {
    console.error('Unexpected error in handleAddSite:', err)
    error.value = err.message || 'An unexpected error occurred. Please check the console for details.'
  } finally {
    loading.value = false
  }
}

const deleteSite = async (siteId: string) => {
  if (!$supabase) return
  
  if (!confirm('Are you sure you want to delete this site?')) {
    return
  }

  try {
    const { error: deleteError } = await $supabase
      .from('sites')
      .delete()
      .eq('id', siteId)

    if (deleteError) {
      alert('Failed to delete site: ' + deleteError.message)
      return
    }

    await fetchSites()
  } catch (err: any) {
    alert('Error deleting site: ' + err.message)
  }
}

</script>


