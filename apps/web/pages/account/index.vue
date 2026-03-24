<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <NuxtLink
      to="/dashboard"
      class="mb-6 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
    >
      ← Dashboard
    </NuxtLink>
    <h1 class="mb-2 text-2xl font-semibold text-surface-900">Account</h1>
    <p class="mb-6 text-sm text-surface-500">
      Update your name and password. Agency owners can invite team members and clients here; email content is edited in
      <NuxtLink to="/admin/emails" class="font-medium text-primary-600 hover:underline">Admin → Emails</NuxtLink>.
    </p>

    <!-- Default Google (dashboard + default for site integrations) -->
    <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-surface-900">Default Google account</h2>
      <p class="mt-1 text-sm text-surface-500">
        This Gmail is used for the dashboard calendar and as the default when you connect Google on a site. You can still disconnect or use another Gmail on any site’s integration.
      </p>

      <div
        v-if="defaultGoogleToast === 'connected' && defaultGoogle?.connected && !defaultGoogleLoading"
        class="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
      >
        Google connected. You can choose a calendar below.
      </div>
      <div
        v-else-if="defaultGoogleToast === 'error'"
        class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      >
        Google sign-in failed. Try again or check Admin → Integrations OAuth settings.
      </div>
      <div
        v-else-if="defaultGoogleToast === 'denied'"
        class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Access was denied. You can try again when ready.
      </div>
      <div
        v-else-if="defaultGoogleToast === 'notsaved'"
        class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
      >
        <p class="font-medium">Google signed in, but tokens were not saved in the database.</p>
        <p class="mt-2">
          In <strong>PocketBase Admin</strong>, open <strong>Collections → users</strong>, add a field:
          <code class="rounded bg-red-100 px-1 py-0.5 text-red-950">default_google_json</code>, type <strong>JSON</strong>
          (not required). Save the collection, then use <strong>Connect Google</strong> again.
        </p>
      </div>

      <div v-if="defaultGoogleLoading" class="mt-4 text-sm text-surface-500">Loading…</div>
      <div v-else class="mt-4 space-y-4">
        <template v-if="!defaultGoogle?.connected">
          <p class="text-sm text-surface-600">No default Google account yet.</p>
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="defaultGoogleBusy"
            @click="connectDefaultGoogle"
          >
            {{ defaultGoogleBusy ? 'Redirecting…' : 'Connect Google' }}
          </button>
          <p v-if="defaultGoogleError" class="text-sm text-red-600">{{ defaultGoogleError }}</p>
        </template>
        <template v-else>
          <p class="text-sm text-surface-700">
            Connected as <strong>{{ defaultGoogle.email || 'Google' }}</strong>
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
              :disabled="defaultGoogleBusy"
              @click="disconnectDefaultGoogle"
            >
              {{ defaultGoogleBusy ? 'Updating…' : 'Disconnect' }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
              :disabled="defaultGoogleBusy"
              @click="reconnectDefaultGoogle"
            >
              {{ defaultGoogleBusy ? 'Redirecting…' : 'Reconnect (new scopes)' }}
            </button>
          </div>

          <div v-if="defaultGoogle.hasCalendarScope" class="border-t border-surface-100 pt-4">
            <h3 class="text-sm font-semibold text-surface-900">Dashboard calendars</h3>
            <p class="mt-1 text-sm text-surface-500">
              After Google loads your calendar list, check every calendar you want on the main dashboard. You can pick more than one.
            </p>
            <div class="mt-3 flex flex-wrap items-start gap-4">
              <p v-if="calendarsLoading" class="text-sm text-surface-500">Loading calendar list…</p>
              <button
                v-else-if="!calendars.length"
                type="button"
                class="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-500"
                @click="loadCalendars"
              >
                Load calendars
              </button>
              <div v-else class="min-w-0 flex-1 space-y-3">
                <ul
                  class="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-surface-200 bg-surface-50/50 p-3"
                  role="group"
                  aria-label="Calendars to show on dashboard"
                >
                  <li v-for="(c, idx) in calendars" :key="c.id" class="flex items-start gap-2">
                    <input
                      :id="'cal-pick-' + idx"
                      type="checkbox"
                      :checked="selectedCalendarIds.includes(c.id)"
                      class="mt-0.5 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                      @change="toggleCalendarPick(c.id)"
                    />
                    <label :for="'cal-pick-' + idx" class="cursor-pointer text-sm leading-snug text-surface-800">
                      {{ c.summary }}{{ c.primary ? ' (primary)' : '' }}
                    </label>
                  </li>
                </ul>
                <div class="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
                    :disabled="calendarSaving"
                    @click="saveDefaultCalendar"
                  >
                    {{ calendarSaving ? 'Saving…' : 'Save selection' }}
                  </button>
                  <button
                    type="button"
                    class="text-sm font-medium text-surface-600 hover:text-surface-900"
                    :disabled="calendarsLoading"
                    @click="loadCalendars"
                  >
                    Refresh list
                  </button>
                </div>
              </div>
            </div>
            <p v-if="calendarError" class="mt-2 text-sm text-red-600">{{ calendarError }}</p>
          </div>
          <div v-else class="border-t border-surface-100 pt-4">
            <p class="text-sm text-amber-800">
              Reconnect Google and approve Calendar access to pick a dashboard calendar. Enable the Google Calendar API in Google Cloud for your OAuth client.
            </p>
          </div>
        </template>
      </div>
    </section>

    <!-- Team & clients (agency owner only) -->
    <section
      v-if="workspaceLoaded && workspace.canManageTeam"
      class="mb-8 space-y-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 class="text-lg font-semibold text-surface-900">Team &amp; clients</h2>
        <p class="mt-1 text-sm text-surface-500">
          <strong>Team members</strong> can use the same sites and tools as you. <strong>Clients</strong> get read-only access to the sites you assign.
        </p>
      </div>

      <div class="border-t border-surface-100 pt-6">
        <h3 class="text-base font-semibold text-surface-900">Invite team member</h3>
        <p class="mt-1 text-sm text-surface-500">Sends the <em>Agency team member invite</em> email from Admin → Emails.</p>
        <form class="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" @submit.prevent="inviteMember">
          <div class="min-w-[12rem] flex-1">
            <label class="mb-1 block text-sm font-medium text-surface-700">Email</label>
            <input
              v-model="memberEmail"
              type="email"
              required
              class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm"
              placeholder="teammate@company.com"
            />
          </div>
          <div class="min-w-[10rem] flex-1">
            <label class="mb-1 block text-sm font-medium text-surface-700">Name (optional)</label>
            <input v-model="memberName" type="text" class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm" />
          </div>
          <button
            type="submit"
            :disabled="memberInviting"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
          >
            {{ memberInviting ? 'Inviting…' : 'Invite member' }}
          </button>
        </form>
        <p v-if="memberMsg" class="mt-2 text-sm text-green-700">{{ memberMsg }}</p>
        <p v-if="memberErr" class="mt-2 text-sm text-red-600">{{ memberErr }}</p>

        <ul v-if="workspace.members.length" class="mt-4 divide-y divide-surface-100 rounded-lg border border-surface-100">
          <li
            v-for="m in workspace.members"
            :key="m.id"
            class="flex items-center justify-between gap-2 px-3 py-2 text-sm"
          >
            <span>{{ m.name || m.email }} <span class="text-surface-500">{{ m.email }}</span></span>
            <button
              type="button"
              class="text-red-600 hover:underline"
              @click="removeUser(m.id)"
            >
              Remove
            </button>
          </li>
        </ul>
        <p v-else class="mt-3 text-sm text-surface-500">No team members yet.</p>
      </div>

      <div class="border-t border-surface-100 pt-6">
        <h3 class="text-base font-semibold text-surface-900">Invite client</h3>
        <p class="mt-1 text-sm text-surface-500">Sends the <em>Client portal invite</em> email. Choose which sites they can view.</p>
        <form class="mt-4 space-y-4" @submit.prevent="inviteClient">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-surface-700">Email</label>
              <input
                v-model="clientEmail"
                type="email"
                required
                class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm"
                placeholder="client@example.com"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-surface-700">Name (optional)</label>
              <input v-model="clientName" type="text" class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-surface-700">Sites they can access</label>
            <div v-if="!workspace.ownerSites.length" class="text-sm text-amber-800">
              Add a site under <NuxtLink to="/sites" class="underline">Sites</NuxtLink> first.
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <label
                v-for="s in workspace.ownerSites"
                :key="s.id"
                class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-surface-200 px-3 py-2 text-sm"
                :class="clientSiteIds.includes(s.id) ? 'border-primary-300 bg-primary-50' : ''"
              >
                <input v-model="clientSiteIds" type="checkbox" :value="s.id" class="rounded border-surface-300" />
                {{ s.name }}
              </label>
            </div>
          </div>
          <button
            type="submit"
            :disabled="clientInviting || !workspace.ownerSites.length"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
          >
            {{ clientInviting ? 'Inviting…' : 'Invite client' }}
          </button>
        </form>
        <p v-if="clientMsg" class="mt-2 text-sm text-green-700">{{ clientMsg }}</p>
        <p v-if="clientErr" class="mt-2 text-sm text-red-600">{{ clientErr }}</p>

        <ul v-if="workspace.clients.length" class="mt-4 divide-y divide-surface-100 rounded-lg border border-surface-100">
          <li
            v-for="c in workspace.clients"
            :key="c.id"
            class="flex flex-col gap-2 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <span class="font-medium text-surface-900">{{ c.name || c.email }}</span>
              <span class="text-surface-500">{{ c.email }}</span>
              <p class="mt-1 text-xs text-surface-500">
                Sites:
                {{ siteLabels(c.siteIds) }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="text-primary-600 hover:underline" @click="openEditClient(c)">Edit sites</button>
              <button type="button" class="text-red-600 hover:underline" @click="removeUser(c.id)">Remove</button>
            </div>
          </li>
        </ul>
        <p v-else class="mt-3 text-sm text-surface-500">No clients yet.</p>
      </div>
    </section>

    <!-- Edit client sites modal -->
    <div
      v-if="editClient"
      class="fixed inset-0 z-50 flex items-end justify-center bg-surface-900/50 p-4 sm:items-center"
      @keydown.esc="editClient = null"
    >
      <div class="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" @click.stop>
        <h3 class="text-lg font-semibold text-surface-900">Sites for {{ editClient.email }}</h3>
        <div class="mt-4 flex flex-wrap gap-2">
          <label
            v-for="s in workspace.ownerSites"
            :key="s.id"
            class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-surface-200 px-3 py-2 text-sm"
            :class="editClientSiteIds.includes(s.id) ? 'border-primary-300 bg-primary-50' : ''"
          >
            <input v-model="editClientSiteIds" type="checkbox" :value="s.id" class="rounded border-surface-300" />
            {{ s.name }}
          </label>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-surface-200 px-4 py-2 text-sm" @click="editClient = null">Cancel</button>
          <button
            type="button"
            :disabled="savingClientSites"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            @click="saveClientSites"
          >
            {{ savingClientSites ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    <section class="mb-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-surface-900">Agency logo</h2>
      <p class="mt-2 text-sm text-surface-500">
        This logo appears on all reports. Individual sites can still use their own logo in Site Settings.
      </p>
      <div class="mt-4 flex flex-wrap items-start gap-6">
        <div class="flex h-14 w-40 shrink-0 items-center justify-center overflow-hidden rounded border border-surface-200 bg-surface-50">
          <img
            v-if="agencyLogoPreview"
            :src="agencyLogoPreview"
            alt="Agency logo"
            class="h-full w-full object-contain object-left"
          />
          <span v-else class="text-xs text-surface-400">No logo set</span>
        </div>
        <div class="min-w-0 flex-1">
          <input
            ref="agencyLogoInput"
            type="file"
            accept="image/*"
            class="block w-full text-sm text-surface-600 file:mr-3 file:rounded file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            @change="onAgencyLogoFileChange"
          />
          <p class="mt-2 text-xs text-surface-500">Max 2MB. PNG, JPG or GIF.</p>
          <button
            type="button"
            class="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="agencyLogoUploading || !agencyLogoFile"
            @click="uploadAgencyLogo"
          >
            {{ agencyLogoUploading ? 'Uploading…' : 'Upload agency logo' }}
          </button>
          <p v-if="agencyLogoError" class="mt-2 text-sm text-red-600">{{ agencyLogoError }}</p>
          <p v-if="agencyLogoSuccess" class="mt-2 text-sm text-green-600">Agency logo updated.</p>
        </div>
      </div>
    </section>

    <section class="mb-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-surface-900">Report branding colors</h2>
      <p class="mt-2 text-sm text-surface-500">
        When you upload an agency logo, Claude suggests colors automatically. You can override them anytime.
      </p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-surface-700">Primary</label>
          <div class="mt-1 flex items-center gap-2">
            <input v-model="branding.primary" type="color" class="h-9 w-12 rounded border border-surface-200 bg-white p-1" />
            <input v-model="branding.primary" type="text" class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Accent</label>
          <div class="mt-1 flex items-center gap-2">
            <input v-model="branding.accent" type="color" class="h-9 w-12 rounded border border-surface-200 bg-white p-1" />
            <input v-model="branding.accent" type="text" class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Text</label>
          <div class="mt-1 flex items-center gap-2">
            <input v-model="branding.text" type="color" class="h-9 w-12 rounded border border-surface-200 bg-white p-1" />
            <input v-model="branding.text" type="text" class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Surface</label>
          <div class="mt-1 flex items-center gap-2">
            <input v-model="branding.surface" type="color" class="h-9 w-12 rounded border border-surface-200 bg-white p-1" />
            <input v-model="branding.surface" type="text" class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="rounded-lg border border-primary-600 bg-white px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-50"
          :disabled="brandingSaving || brandingSuggesting || brandingResetting"
          @click="saveBranding"
        >
          {{ brandingSaving ? 'Saving…' : 'Save report colors' }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-surface-300 bg-white px-4 py-2 text-sm font-semibold text-surface-700 hover:bg-surface-50 disabled:opacity-50"
          :disabled="brandingSaving || brandingSuggesting || brandingResetting"
          @click="suggestBrandingFromLogo"
        >
          {{ brandingSuggesting ? 'Analyzing logo…' : 'Pull Colors from Logo' }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-surface-300 bg-white px-4 py-2 text-sm font-semibold text-surface-700 hover:bg-surface-50 disabled:opacity-50"
          :disabled="brandingSaving || brandingSuggesting || brandingResetting"
          @click="resetBranding"
        >
          {{ brandingResetting ? 'Resetting…' : 'Reset to defaults' }}
        </button>
        <span v-if="brandingMessage" class="text-sm text-surface-600">{{ brandingMessage }}</span>
      </div>
    </section>

    <form class="space-y-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm" @submit.prevent="save">
      <div>
        <label for="account-name" class="block text-sm font-medium text-surface-700">Name</label>
        <input
          id="account-name"
          v-model="form.name"
          type="text"
          autocomplete="name"
          class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Your name"
        />
      </div>

      <div class="border-t border-surface-200 pt-6">
        <h2 class="text-sm font-semibold text-surface-900">Change password</h2>
        <p class="mt-1 text-sm text-surface-500">Leave blank to keep your current password.</p>
        <div class="mt-4 space-y-4">
          <div>
            <label for="account-password" class="block text-sm font-medium text-surface-700">New password</label>
            <input
              id="account-password"
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label for="account-password-confirm" class="block text-sm font-medium text-surface-700">Confirm new password</label>
            <input
              id="account-password-confirm"
              v-model="form.passwordConfirm"
              type="password"
              autocomplete="new-password"
              class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="success" class="text-sm text-green-600">{{ success }}</p>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="rounded-lg border border-surface-300 px-4 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-100"
          @click="handleLogout"
        >
          Log out
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { AccountGoogleStatus } from '~/composables/useAccountGoogle'
import { getApiErrorMessage } from '~/utils/apiError'

definePageMeta({ layout: 'default' })

const pb = usePocketbase()
const { user, logout } = useAuthState()
const router = useRouter()
const route = useRoute()
const { getStatus, disconnect, redirectToConnect, getCalendars, selectDashboardCalendars } = useAccountGoogle()

const defaultGoogleLoading = ref(true)
const defaultGoogle = ref<AccountGoogleStatus | null>(null)
const defaultGoogleBusy = ref(false)
const defaultGoogleError = ref('')
const defaultGoogleToast = ref<'connected' | 'error' | 'denied' | 'notsaved' | null>(null)

const calendars = ref<Array<{ id: string; summary: string; primary?: boolean }>>([])
const calendarsLoading = ref(false)
const selectedCalendarIds = ref<string[]>([])
const calendarSaving = ref(false)
const calendarError = ref('')

const form = reactive({
  name: '',
  password: '',
  passwordConfirm: '',
})
const error = ref('')
const success = ref('')
const saving = ref(false)
const agencyLogoPreview = ref<string | null>(null)
const agencyLogoFile = ref<File | null>(null)
const agencyLogoInput = ref<HTMLInputElement | null>(null)
const agencyLogoUploading = ref(false)
const agencyLogoError = ref('')
const agencyLogoSuccess = ref(false)
const branding = reactive({
  primary: '#2563EB',
  accent: '#1D4ED8',
  text: '#0F172A',
  surface: '#FFFFFF',
})
const brandingSaving = ref(false)
const brandingSuggesting = ref(false)
const brandingResetting = ref(false)
const brandingMessage = ref('')
const defaultBranding = {
  primary: '#2563EB',
  accent: '#1D4ED8',
  text: '#0F172A',
  surface: '#FFFFFF',
}

/** Team / clients (agency owner) */
const workspaceLoaded = ref(false)
const workspace = reactive({
  canManageTeam: false,
  members: [] as Array<{ id: string; email: string; name: string }>,
  clients: [] as Array<{ id: string; email: string; name: string; siteIds: string[] }>,
  ownerSites: [] as Array<{ id: string; name: string; domain: string }>,
})
const memberEmail = ref('')
const memberName = ref('')
const memberInviting = ref(false)
const memberMsg = ref('')
const memberErr = ref('')
const clientEmail = ref('')
const clientName = ref('')
const clientSiteIds = ref<string[]>([])
const clientInviting = ref(false)
const clientMsg = ref('')
const clientErr = ref('')
const editClient = ref<{ id: string; email: string } | null>(null)
const editClientSiteIds = ref<string[]>([])
const savingClientSites = ref(false)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadWorkspace() {
  workspaceLoaded.value = false
  try {
    const res = await $fetch<{
      canManageTeam?: boolean
      members?: typeof workspace.members
      clients?: typeof workspace.clients
      ownerSites?: typeof workspace.ownerSites
    }>('/api/account/workspace', { headers: authHeaders() })
    workspace.canManageTeam = !!res.canManageTeam
    workspace.members = res.members ?? []
    workspace.clients = res.clients ?? []
    workspace.ownerSites = res.ownerSites ?? []
  } catch {
    workspace.canManageTeam = false
  } finally {
    workspaceLoaded.value = true
  }
}

function siteLabels(ids: string[]) {
  if (!ids.length) return '—'
  return ids
    .map((id) => workspace.ownerSites.find((s) => s.id === id)?.name || id)
    .join(', ')
}

async function inviteMember() {
  memberMsg.value = ''
  memberErr.value = ''
  memberInviting.value = true
  try {
    await $fetch('/api/account/invite-member', {
      method: 'POST',
      headers: authHeaders(),
      body: { email: memberEmail.value.trim(), name: memberName.value.trim() },
    })
    memberMsg.value = 'Invitation sent. They can sign in at the login page (use Forgot password if needed).'
    memberEmail.value = ''
    memberName.value = ''
    await loadWorkspace()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    memberErr.value = err?.data?.message ?? err?.message ?? 'Invite failed'
  } finally {
    memberInviting.value = false
  }
}

async function inviteClient() {
  clientMsg.value = ''
  clientErr.value = ''
  if (!clientSiteIds.value.length) {
    clientErr.value = 'Select at least one site.'
    return
  }
  clientInviting.value = true
  try {
    await $fetch('/api/account/invite-client', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        email: clientEmail.value.trim(),
        name: clientName.value.trim(),
        siteIds: clientSiteIds.value,
      },
    })
    clientMsg.value = 'Client invited. They can sign in at the login page.'
    clientEmail.value = ''
    clientName.value = ''
    clientSiteIds.value = []
    await loadWorkspace()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    clientErr.value = err?.data?.message ?? err?.message ?? 'Invite failed'
  } finally {
    clientInviting.value = false
  }
}

async function removeUser(uid: string) {
  if (!confirm('Remove this user from your workspace?')) return
  try {
    await $fetch('/api/account/remove-workspace-user', {
      method: 'POST',
      headers: authHeaders(),
      body: { userId: uid },
    })
    await loadWorkspace()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    alert(err?.data?.message ?? err?.message ?? 'Remove failed')
  }
}

function openEditClient(c: { id: string; email: string; siteIds: string[] }) {
  editClient.value = { id: c.id, email: c.email }
  editClientSiteIds.value = [...c.siteIds]
}

async function saveClientSites() {
  if (!editClient.value) return
  savingClientSites.value = true
  try {
    await $fetch('/api/account/update-client-sites', {
      method: 'POST',
      headers: authHeaders(),
      body: { clientId: editClient.value.id, siteIds: editClientSiteIds.value },
    })
    editClient.value = null
    await loadWorkspace()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    alert(err?.data?.message ?? err?.message ?? 'Save failed')
  } finally {
    savingClientSites.value = false
  }
}

// Prefill from current user
watch(
  user,
  (u) => {
    const model = u as { name?: string } | null
    if (model?.name !== undefined) form.name = model.name ?? ''
  },
  { immediate: true }
)

async function loadDefaultGoogle() {
  defaultGoogleLoading.value = true
  defaultGoogleError.value = ''
  try {
    defaultGoogle.value = await getStatus()
    if (defaultGoogleToast.value === 'connected' && !defaultGoogle.value?.connected) {
      defaultGoogleToast.value = null
      defaultGoogleError.value =
        'Google sign-in finished, but your default account was not saved. Add a JSON field `default_google_json` on the PocketBase users collection (or check server logs), then use Connect Google again.'
    }
    selectedCalendarIds.value = (defaultGoogle.value?.calendars ?? []).map((c) => c.id)
    if (defaultGoogle.value?.connected && defaultGoogle.value.hasCalendarScope) {
      await loadCalendars()
    }
  } catch {
    defaultGoogle.value = null
    if (defaultGoogleToast.value === 'connected') {
      defaultGoogleToast.value = null
      defaultGoogleError.value =
        'Could not load your Google account status. Check your connection or server configuration.'
    }
  } finally {
    defaultGoogleLoading.value = false
  }
}

function toggleCalendarPick(id: string) {
  const i = selectedCalendarIds.value.indexOf(id)
  if (i >= 0) selectedCalendarIds.value = selectedCalendarIds.value.filter((x) => x !== id)
  else selectedCalendarIds.value = [...selectedCalendarIds.value, id]
}

async function loadCalendars() {
  calendarsLoading.value = true
  calendarError.value = ''
  try {
    const res = await getCalendars()
    calendars.value = res.calendars ?? []
    const validIds = new Set(calendars.value.map((c) => c.id))
    selectedCalendarIds.value = selectedCalendarIds.value.filter((id) => validIds.has(id))
    if (selectedCalendarIds.value.length === 0 && calendars.value.length) {
      const saved = defaultGoogle.value?.calendars ?? []
      if (saved.length) {
        selectedCalendarIds.value = saved.map((c) => c.id).filter((id) => validIds.has(id))
      } else if (!defaultGoogle.value?.calendarSelectionConfigured) {
        const primary = calendars.value.find((c) => c.primary)
        selectedCalendarIds.value = [primary?.id ?? calendars.value[0].id]
      }
    }
  } catch (e) {
    calendarError.value = getApiErrorMessage(e)
  } finally {
    calendarsLoading.value = false
  }
}

async function saveDefaultCalendar() {
  const picked = calendars.value.filter((c) => selectedCalendarIds.value.includes(c.id))
  calendarSaving.value = true
  calendarError.value = ''
  try {
    await selectDashboardCalendars(picked.map((c) => ({ id: c.id, summary: c.summary })))
    await loadDefaultGoogle()
  } catch (e) {
    calendarError.value = getApiErrorMessage(e)
  } finally {
    calendarSaving.value = false
  }
}

async function connectDefaultGoogle() {
  defaultGoogleError.value = ''
  defaultGoogleBusy.value = true
  const res = await redirectToConnect(false)
  defaultGoogleBusy.value = false
  if (!res.ok) defaultGoogleError.value = res.message
}

async function reconnectDefaultGoogle() {
  defaultGoogleError.value = ''
  defaultGoogleBusy.value = true
  const res = await redirectToConnect(true)
  defaultGoogleBusy.value = false
  if (!res.ok) defaultGoogleError.value = res.message
}

async function disconnectDefaultGoogle() {
  if (!confirm('Disconnect your default Google account? Site integrations keep their own connections unless you change them.')) return
  defaultGoogleBusy.value = true
  defaultGoogleError.value = ''
  try {
    await disconnect()
    calendars.value = []
    selectedCalendarIds.value = []
    await loadDefaultGoogle()
  } catch (e) {
    defaultGoogleError.value = getApiErrorMessage(e)
  } finally {
    defaultGoogleBusy.value = false
  }
}

onMounted(() => {
  const q = route.query.google as string | undefined
  if (q === 'connected' || q === 'error' || q === 'denied' || q === 'notsaved') {
    defaultGoogleToast.value = q as 'connected' | 'error' | 'denied' | 'notsaved'
    if (typeof window !== 'undefined') window.history.replaceState({}, '', route.path)
  }
  void loadDefaultGoogle()
  loadAgencyLogoPreview()
  loadBranding()
  void loadWorkspace()
})

onBeforeUnmount(() => {
  if (agencyLogoPreview.value) {
    URL.revokeObjectURL(agencyLogoPreview.value)
    agencyLogoPreview.value = null
  }
})

async function save() {
  error.value = ''
  success.value = ''
  const id = (user.value as { id?: string } | null)?.id
  if (!id) {
    error.value = 'Not signed in.'
    return
  }

  const wantPasswordChange = form.password.trim() !== '' || form.passwordConfirm.trim() !== ''
  if (wantPasswordChange && form.password !== form.passwordConfirm) {
    error.value = 'New password and confirm password do not match.'
    return
  }
  if (wantPasswordChange && form.password.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }

  saving.value = true
  try {
    const payload: { name?: string; password?: string; passwordConfirm?: string } = {
      name: (form.name.trim() || (user.value as { email?: string })?.email?.split('@')[0]) || '',
    }
    if (wantPasswordChange) {
      payload.password = form.password
      payload.passwordConfirm = form.passwordConfirm
    }
    await pb.collection('users').update(id, payload)
    user.value = (await pb.collection('users').getOne(id)) as Record<string, unknown>
    form.password = ''
    form.passwordConfirm = ''
    success.value = 'Account updated.'
  } catch (e: unknown) {
    const err = e as { message?: string; data?: { data?: { message?: string } } }
    error.value = err?.data?.data?.message ?? err?.message ?? 'Failed to update account.'
  } finally {
    saving.value = false
  }
}

async function handleLogout() {
  logout()
  await router.push('/auth/login')
}

async function loadAgencyLogoPreview() {
  if (agencyLogoPreview.value) {
    URL.revokeObjectURL(agencyLogoPreview.value)
    agencyLogoPreview.value = null
  }
  try {
    const blob = await $fetch<Blob>('/api/agency/logo', { responseType: 'blob' })
    if (blob?.size) agencyLogoPreview.value = URL.createObjectURL(blob)
  } catch {
    // No logo set
  }
}

function onAgencyLogoFileChange(e: Event) {
  agencyLogoError.value = ''
  agencyLogoSuccess.value = false
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) {
    agencyLogoFile.value = null
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    agencyLogoError.value = 'File must be under 2MB.'
    agencyLogoFile.value = null
    return
  }
  agencyLogoFile.value = file
}

async function uploadAgencyLogo() {
  const file = agencyLogoFile.value
  if (!file) return
  agencyLogoError.value = ''
  agencyLogoSuccess.value = false
  agencyLogoUploading.value = true
  try {
    const formData = new FormData()
    formData.append('logo', file)
    await $fetch('/api/admin/agency/logo', {
      method: 'POST',
      body: formData,
    })
    agencyLogoSuccess.value = true
    agencyLogoFile.value = null
    if (agencyLogoInput.value) agencyLogoInput.value.value = ''
    await loadAgencyLogoPreview()
    await loadBranding()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    agencyLogoError.value = err?.data?.message ?? err?.message ?? 'Upload failed'
  } finally {
    agencyLogoUploading.value = false
  }
}

async function loadBranding() {
  try {
    const res = await $fetch<{ colors?: Partial<typeof branding> }>('/api/agency/branding')
    const colors = res?.colors ?? {}
    branding.primary = String(colors.primary || branding.primary)
    branding.accent = String(colors.accent || branding.accent)
    branding.text = String(colors.text || branding.text)
    branding.surface = String(colors.surface || branding.surface)
  } catch {
    // keep defaults
  }
}

async function saveBranding() {
  brandingSaving.value = true
  brandingMessage.value = ''
  try {
    await $fetch('/api/admin/agency/branding', {
      method: 'POST',
      body: {
        primary: branding.primary,
        accent: branding.accent,
        text: branding.text,
        surface: branding.surface,
      },
    })
    brandingMessage.value = 'Report colors saved.'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    brandingMessage.value = err?.data?.message ?? err?.message ?? 'Failed to save colors.'
  } finally {
    brandingSaving.value = false
  }
}

async function suggestBrandingFromLogo() {
  brandingSuggesting.value = true
  brandingMessage.value = ''
  try {
    const res = await $fetch<{ colors?: Partial<typeof branding> }>('/api/admin/agency/branding/suggest', {
      method: 'POST',
    })
    const colors = res?.colors ?? {}
    branding.primary = String(colors.primary || branding.primary)
    branding.accent = String(colors.accent || branding.accent)
    branding.text = String(colors.text || branding.text)
    branding.surface = String(colors.surface || branding.surface)
    brandingMessage.value = 'Claude refreshed the color palette from your logo.'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    brandingMessage.value = err?.data?.message ?? err?.message ?? 'Could not analyze the logo.'
  } finally {
    brandingSuggesting.value = false
  }
}

async function resetBranding() {
  brandingResetting.value = true
  brandingMessage.value = ''
  try {
    await $fetch('/api/admin/agency/branding', {
      method: 'POST',
      body: { ...defaultBranding },
    })
    branding.primary = defaultBranding.primary
    branding.accent = defaultBranding.accent
    branding.text = defaultBranding.text
    branding.surface = defaultBranding.surface
    brandingMessage.value = 'Reset to default report colors.'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    brandingMessage.value = err?.data?.message ?? err?.message ?? 'Failed to reset colors.'
  } finally {
    brandingResetting.value = false
  }
}
</script>
