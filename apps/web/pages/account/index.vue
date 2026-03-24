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

    <nav class="mb-6 inline-flex rounded-lg border border-surface-200 bg-white p-1 text-sm shadow-sm">
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'account' ? 'bg-primary-600 text-white' : 'text-surface-700 hover:bg-surface-50'"
        @click="activeTab = 'account'"
      >
        Account
      </button>
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'agency' ? 'bg-primary-600 text-white' : 'text-surface-700 hover:bg-surface-50'"
        @click="activeTab = 'agency'"
      >
        Agency
      </button>
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'team' ? 'bg-primary-600 text-white' : 'text-surface-700 hover:bg-surface-50'"
        @click="activeTab = 'team'"
      >
        Team
      </button>
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'clients' ? 'bg-primary-600 text-white' : 'text-surface-700 hover:bg-surface-50'"
        @click="activeTab = 'clients'"
      >
        Clients
      </button>
    </nav>

    <template v-if="activeTab === 'account'">

      <form class="space-y-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm" @submit.prevent="save">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="account-first-name" class="block text-sm font-medium text-surface-700">First name</label>
            <input
              id="account-first-name"
              v-model="form.firstName"
              type="text"
              autocomplete="given-name"
              class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="Jane"
            />
          </div>
          <div>
            <label for="account-last-name" class="block text-sm font-medium text-surface-700">Last name</label>
            <input
              id="account-last-name"
              v-model="form.lastName"
              type="text"
              autocomplete="family-name"
              class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="Doe"
            />
          </div>
        </div>
        <div>
          <label for="account-email" class="block text-sm font-medium text-surface-700">Email</label>
          <input
            id="account-email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Profile image</label>
          <div class="mt-2 flex flex-wrap items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-surface-200 bg-surface-100">
              <img v-if="profileImagePreviewUrl" :src="profileImagePreviewUrl" alt="Profile image" class="h-full w-full object-cover" />
              <span v-else class="text-xs font-semibold text-surface-500">{{ profileInitials }}</span>
            </div>
            <input
              ref="profileImageInput"
              type="file"
              accept="image/*"
              class="block text-sm text-surface-600 file:mr-3 file:rounded file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
              @change="onProfileImageFileChange"
            />
            <button
              type="button"
              class="rounded-lg border border-surface-300 px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
              :disabled="profileImageUploading || !profileImageFile"
              @click="uploadProfileImage"
            >
              {{ profileImageUploading ? 'Uploading…' : 'Upload image' }}
            </button>
          </div>
          <p v-if="profileImageError" class="mt-2 text-sm text-red-600">{{ profileImageError }}</p>
          <p v-if="profileImageSuccess" class="mt-2 text-sm text-green-600">Profile image updated.</p>
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
    </template>

    <template v-else-if="activeTab === 'team'">

    <!-- Team -->
    <section
      v-if="workspaceLoaded && workspace.canManageTeam"
      class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 class="text-lg font-semibold text-surface-900">Team members</h2>
        <p class="mt-1 text-sm text-surface-500">
          Team members can use the same sites and tools as you.
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

    </section>
    </template>

    <template v-else-if="activeTab === 'clients'">
      <section
        v-if="workspaceLoaded && workspace.canManageTeam"
        class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm"
      >
        <h2 class="text-lg font-semibold text-surface-900">Clients</h2>
        <p class="mt-1 text-sm text-surface-500">
          Clients get read-only access to the sites you assign.
        </p>
        <div class="mt-6 border-t border-surface-100 pt-6">
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
    </template>

    <template v-else>
      <section class="mb-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-surface-900">Agency details</h2>
      <p class="mt-2 text-sm text-surface-500">
        Used on report headers and exported PDFs.
      </p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-surface-700">Name</label>
          <input
            v-model="agencyName"
            type="text"
            maxlength="120"
            class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
            placeholder="Acme Marketing"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-surface-700">Address</label>
          <input
            v-model="agencyAddress"
            type="text"
            maxlength="180"
            class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
            placeholder="123 Main St, Raleigh, NC 27601"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Phone</label>
          <input
            v-model="agencyPhone"
            type="text"
            maxlength="40"
            class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
            placeholder="(919) 555-1212"
          />
        </div>
      </div>
      </section>

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

      <section class="mb-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-surface-900">Default Google account</h2>
      <p class="mt-1 text-sm text-surface-500">
        Connect the Gmail used for dashboard calendar and as the default for site Google integrations.
      </p>
      <div class="mt-4">
        <div v-if="defaultGoogleLoading" class="text-sm text-surface-500">Loading…</div>
        <div v-else-if="!defaultGoogle?.connected" class="space-y-3">
          <p class="text-sm text-surface-600">No default Google account yet.</p>
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="defaultGoogleBusy"
            @click="connectDefaultGoogle"
          >
            {{ defaultGoogleBusy ? 'Redirecting…' : 'Connect Google' }}
          </button>
        </div>
        <div v-else class="space-y-3">
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
              {{ defaultGoogleBusy ? 'Redirecting…' : 'Reconnect' }}
            </button>
          </div>
          <p v-if="defaultGoogle.hasCalendarScope" class="text-xs text-surface-500">
            {{ selectedCalendarIds.length }} dashboard calendar{{ selectedCalendarIds.length === 1 ? '' : 's' }} selected.
          </p>
          <p v-else class="text-xs text-amber-800">
            Calendar scope not granted yet. Reconnect and approve Calendar access.
          </p>
        </div>
        <p v-if="defaultGoogleError" class="mt-2 text-sm text-red-600">{{ defaultGoogleError }}</p>
      </div>
      </section>
    </template>
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
const activeTab = ref<'account' | 'agency' | 'team' | 'clients'>('account')

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
  firstName: '',
  lastName: '',
  email: '',
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
const profileImageInput = ref<HTMLInputElement | null>(null)
const profileImageFile = ref<File | null>(null)
const profileImageUploading = ref(false)
const profileImageError = ref('')
const profileImageSuccess = ref(false)
const agencyName = ref('')
const agencyAddress = ref('')
const agencyPhone = ref('')
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
    const model = u as { first_name?: string; last_name?: string; name?: string; email?: string } | null
    if (!model) return
    form.firstName = (model.first_name ?? '').trim()
    form.lastName = (model.last_name ?? '').trim()
    form.email = model.email ?? ''
    if (!form.firstName && !form.lastName && model.name) {
      const parts = String(model.name).trim().split(/\s+/)
      form.firstName = parts[0] ?? ''
      form.lastName = parts.slice(1).join(' ')
    }
  },
  { immediate: true }
)

const profileInitials = computed(() => {
  const first = (form.firstName || '').trim()
  const last = (form.lastName || '').trim()
  if (first || last) return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || 'U'
  const email = (form.email || '').trim()
  return email ? email.slice(0, 2).toUpperCase() : 'U'
})

const profileImagePreviewUrl = computed(() => {
  const model = user.value as { avatar?: string } | null
  const avatar = model?.avatar
  if (!model || !avatar || typeof avatar !== 'string') return ''
  return pb.files.getUrl(model as Record<string, unknown>, avatar)
})

function onProfileImageFileChange(e: Event) {
  profileImageError.value = ''
  profileImageSuccess.value = false
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) {
    profileImageFile.value = null
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    profileImageError.value = 'Image must be under 2MB.'
    profileImageFile.value = null
    return
  }
  profileImageFile.value = file
}

async function uploadProfileImage() {
  const id = (user.value as { id?: string } | null)?.id
  const file = profileImageFile.value
  if (!id || !file) return
  profileImageUploading.value = true
  profileImageError.value = ''
  profileImageSuccess.value = false
  try {
    await pb.collection('users').update(id, { avatar: file })
    user.value = (await pb.collection('users').getOne(id)) as Record<string, unknown>
    profileImageSuccess.value = true
    profileImageFile.value = null
    if (profileImageInput.value) profileImageInput.value.value = ''
  } catch (e: unknown) {
    const err = e as { data?: { data?: { avatar?: { message?: string } }; message?: string }; message?: string }
    profileImageError.value = err?.data?.data?.avatar?.message ?? err?.data?.message ?? err?.message ?? 'Upload failed.'
  } finally {
    profileImageUploading.value = false
  }
}

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
    const first = form.firstName.trim()
    const last = form.lastName.trim()
    const fullName = [first, last].filter(Boolean).join(' ')
    const payload: {
      name?: string
      first_name?: string
      last_name?: string
      email?: string
      password?: string
      passwordConfirm?: string
    } = {
      name: fullName || (form.email.trim() || (user.value as { email?: string })?.email || '').split('@')[0] || '',
      first_name: first,
      last_name: last,
      email: form.email.trim(),
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
    const res = await $fetch<{ name?: string; address?: string; phone?: string; colors?: Partial<typeof branding> }>('/api/agency/branding')
    const colors = res?.colors ?? {}
    agencyName.value = typeof res?.name === 'string' ? res.name : ''
    agencyAddress.value = typeof res?.address === 'string' ? res.address : ''
    agencyPhone.value = typeof res?.phone === 'string' ? res.phone : ''
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
        name: agencyName.value.trim(),
        address: agencyAddress.value.trim(),
        phone: agencyPhone.value.trim(),
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
      body: {
        name: agencyName.value.trim(),
        address: agencyAddress.value.trim(),
        phone: agencyPhone.value.trim(),
        ...defaultBranding,
      },
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
