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
    <div v-if="googleFlashMessage" class="mb-4 rounded-lg border px-4 py-3 text-sm" :class="googleFlashClass">
      {{ googleFlashMessage }}
    </div>

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
        :class="activeTab === 'integrations' ? 'bg-primary-600 text-white' : 'text-surface-700 hover:bg-surface-50'"
        @click="activeTab = 'integrations'"
      >
        Integrations
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
              <ClientOnly>
                <img v-if="profileImagePreviewUrl" :src="profileImagePreviewUrl" alt="Profile image" class="h-full w-full object-cover" />
                <span v-else class="text-xs font-semibold text-surface-500">{{ profileInitials }}</span>
                <template #fallback>
                  <span class="text-xs font-semibold text-surface-500">{{ profileInitials }}</span>
                </template>
              </ClientOnly>
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

    <template v-else-if="activeTab === 'integrations'">
      <section class="mb-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-surface-900">Default Google integration</h2>
        <p class="mt-1 text-sm text-surface-500">
          Connect one Google account for calendar data. Events from selected calendars appear on the dashboard calendar.
        </p>

        <div v-if="googleLoading" class="mt-4 text-sm text-surface-500">Loading…</div>
        <div v-else class="mt-4 space-y-4">
          <div class="rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 text-sm">
            <p class="text-surface-700">
              <span class="font-medium">Status:</span>
              {{ googleStatus?.connected ? `Connected${googleStatus.email ? ` as ${googleStatus.email}` : ''}` : 'Not connected' }}
            </p>
            <p class="mt-1 text-surface-600">
              <span class="font-medium">Calendar access:</span>
              {{ googleStatus?.hasCalendarScope ? 'Granted' : 'Not granted' }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="googleActionPending"
              @click="connectGoogle"
            >
              {{ googleStatus?.connected ? 'Reconnect Google' : 'Connect Google' }}
            </button>
            <button
              v-if="googleStatus?.connected"
              type="button"
              class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-semibold text-surface-700 hover:bg-surface-50 disabled:opacity-50"
              :disabled="googleActionPending"
              @click="disconnectGoogle"
            >
              Disconnect
            </button>
          </div>
          <p v-if="googleError" class="text-sm text-red-600">{{ googleError }}</p>

          <div v-if="googleStatus?.connected && googleStatus.hasCalendarScope" class="rounded-lg border border-surface-200 p-4">
            <h3 class="text-sm font-semibold text-surface-900">Calendars on dashboard</h3>
            <p class="mt-1 text-xs text-surface-500">Choose calendars to include in the dashboard calendar.</p>

            <div v-if="googleCalendarsLoading" class="mt-3 text-sm text-surface-500">Loading calendars…</div>
            <div v-else class="mt-3 space-y-2">
              <label
                v-for="c in googleCalendars"
                :key="c.id"
                class="flex items-center gap-2 rounded border border-surface-100 px-3 py-2 text-sm"
              >
                <input v-model="selectedCalendarIds" type="checkbox" :value="c.id" class="rounded border-surface-300" />
                <span>{{ c.summary }}</span>
                <span v-if="c.primary" class="ml-1 rounded bg-primary-50 px-1.5 py-0.5 text-xs text-primary-700">Primary</span>
              </label>
              <p v-if="!googleCalendars.length" class="text-sm text-surface-500">No calendars found for this Google account.</p>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="rounded-lg border border-primary-600 bg-white px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50"
                :disabled="calendarSavePending"
                @click="saveCalendarSelection"
              >
                {{ calendarSavePending ? 'Saving…' : 'Save calendars' }}
              </button>
              <p v-if="calendarSaveMessage" class="text-sm text-surface-600">{{ calendarSaveMessage }}</p>
            </div>
          </div>
        </div>
      </section>
    </template>

    <template v-else-if="activeTab === 'team'">

    <!-- Team -->
    <section
      v-if="workspaceLoaded && workspace.canManageTeam"
      class="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-sm"
    >
      <div class="mb-6">
        <h2 class="text-lg font-semibold text-surface-900">Team</h2>
        <p class="mt-1 text-sm text-surface-600">
          Add someone by email — they get a link to set a password, then they see the same sites and tools as you.
        </p>
        <p v-if="workspace.members.length" class="mt-2 text-sm text-surface-700">
          <span class="font-semibold text-surface-900">{{ teamActiveMembers.length }}</span>
          active
          <span class="mx-1.5 text-surface-300">·</span>
          <span class="font-semibold text-amber-800">{{ teamPendingMembers.length }}</span>
          invitation{{ teamPendingMembers.length === 1 ? '' : 's' }} waiting to sign in
        </p>
        <div
          v-if="transactionalSmtpReady === false"
          class="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p class="font-semibold">Invite emails will not send until SMTP is on the web server</p>
          <p class="mt-1 text-amber-900/95">
            PocketBase never exposes the mail password to this app. On the VPS, edit
            <code class="rounded bg-white/80 px-1 py-0.5 text-xs">infra/.env</code>
            and set
            <code class="rounded bg-white/80 px-1 py-0.5 text-xs">SMTP_USER</code>
            and
            <code class="rounded bg-white/80 px-1 py-0.5 text-xs">SMTP_PASSWORD</code>
            to the same mailbox as PocketBase → Settings → Mailer. Then restart the web container:
            <code class="mt-1 block rounded bg-white/80 px-2 py-1 text-xs font-normal text-surface-800">
              docker compose -f infra/docker-compose.yml up -d web
            </code>
          </p>
        </div>
      </div>

      <div v-if="teamPendingMembers.length" class="mb-8 rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
        <h3 class="text-base font-semibold text-amber-950">Waiting to join</h3>
        <p class="mt-1 text-sm text-amber-900/90">
          Invited by email — not active until they complete sign-in. Resend if they can’t find the message.
        </p>
        <ul class="mt-4 divide-y divide-amber-200/90 rounded-lg border border-amber-200/90 bg-white shadow-sm">
          <li
            v-for="m in teamPendingMembers"
            :key="m.id"
            class="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm"
          >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-surface-900">{{ m.name || m.email }}</span>
                <span
                  class="inline-flex shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900"
                >
                  Invited
                </span>
              </div>
              <div class="mt-0.5 break-all text-surface-600">{{ m.email }}</div>
              <div v-if="memberInvitedAtLabel(m)" class="mt-1 text-xs text-surface-500">{{ memberInvitedAtLabel(m) }}</div>
            </div>
            <div class="flex shrink-0 flex-wrap items-center gap-3">
              <button
                type="button"
                class="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                :disabled="memberResendId === m.id"
                @click="resendMemberInvite(m.id)"
              >
                {{ memberResendId === m.id ? 'Sending…' : 'Resend email' }}
              </button>
              <button type="button" class="text-sm text-red-600 hover:underline" @click="removeUser(m.id)">Remove</button>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="teamActiveMembers.length" class="mb-8">
        <h3 class="text-base font-semibold text-surface-900">On the team</h3>
        <ul class="mt-3 divide-y divide-surface-100 rounded-lg border border-surface-200">
          <li
            v-for="m in teamActiveMembers"
            :key="m.id"
            class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
          >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-surface-900">{{ m.name || m.email }}</span>
                <span
                  class="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                >
                  Active
                </span>
              </div>
              <div class="mt-0.5 break-all text-surface-500">{{ m.email }}</div>
            </div>
            <button type="button" class="shrink-0 text-sm text-red-600 hover:underline" @click="removeUser(m.id)">
              Remove
            </button>
          </li>
        </ul>
      </div>

      <div
        v-else-if="!teamPendingMembers.length && !workspace.members.length"
        class="mb-8 rounded-lg border border-dashed border-surface-200 bg-surface-50 px-4 py-8 text-center text-sm text-surface-600"
      >
        No teammates yet. Use the form below — they’ll show up under
        <span class="font-medium text-surface-800">Waiting to join</span> until their first login.
      </div>

      <div class="border-t border-surface-100 pt-6">
        <h3 class="text-base font-semibold text-surface-900">Invite by email</h3>
        <p class="mt-1 text-sm text-surface-500">Enter their work email (and optional name). We send the invite and a password-reset link.</p>
        <details class="mt-3 rounded-lg border border-surface-100 bg-surface-50 px-3 py-2 text-xs text-surface-600">
          <summary class="cursor-pointer font-medium text-primary-600 hover:underline">Advanced: PocketBase mail template</summary>
          <p class="mt-2 leading-relaxed">
            In PocketBase → Mail → Password reset template, set the action URL to
            <code class="rounded bg-white px-1 py-0.5 text-[11px]">{{ resetPasswordUrlHint }}</code>
            plus the token placeholder from PocketBase’s template.
          </p>
        </details>
        <form class="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" @submit.prevent="inviteMember">
          <div class="min-w-[12rem] flex-1">
            <label class="mb-1 block text-sm font-medium text-surface-700">Email</label>
            <input
              v-model="memberEmail"
              type="email"
              required
              autocomplete="email"
              class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm"
              placeholder="teammate@company.com"
            />
          </div>
          <div class="min-w-[10rem] flex-1">
            <label class="mb-1 block text-sm font-medium text-surface-700">Name (optional)</label>
            <input
              v-model="memberName"
              type="text"
              autocomplete="name"
              class="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm"
              placeholder="Alex"
            />
          </div>
          <button
            type="submit"
            :disabled="memberInviting"
            class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
          >
            {{ memberInviting ? 'Sending…' : 'Send invite' }}
          </button>
        </form>
        <p v-if="memberMsg" class="mt-3 text-sm text-emerald-700">{{ memberMsg }}</p>
        <p v-if="memberWarn" class="mt-3 text-sm text-amber-800">{{ memberWarn }}</p>
        <p v-if="memberErr" class="mt-3 text-sm text-red-600">{{ memberErr }}</p>
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
        <div
          v-if="transactionalSmtpReady === false"
          class="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p class="font-semibold">Client invite emails will not send until SMTP is on the web server</p>
          <p class="mt-1 text-amber-900/95">
            Add
            <code class="rounded bg-white/80 px-1 py-0.5 text-xs">SMTP_USER</code>
            and
            <code class="rounded bg-white/80 px-1 py-0.5 text-xs">SMTP_PASSWORD</code>
            to
            <code class="rounded bg-white/80 px-1 py-0.5 text-xs">infra/.env</code>
            (same as PocketBase Mailer), then
            <code class="rounded bg-white/80 px-1 py-0.5 text-xs">docker compose -f infra/docker-compose.yml up -d web</code>.
          </p>
        </div>
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
          <p v-if="clientWarn" class="mt-2 text-sm text-amber-800">{{ clientWarn }}</p>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/apiError'
import { useAccountGoogle } from '~/composables/useAccountGoogle'
import type { AccountGoogleStatus } from '~/composables/useAccountGoogle'

definePageMeta({ layout: 'default' })

const pb = usePocketbase()
const { user, logout } = useAuthState()
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const resetPasswordUrlHint = computed(() => {
  const base = String(config.public.appUrl || '').replace(/\/+$/, '')
  return `${base || 'https://your-domain.com'}/auth/reset-password?token=`
})
const activeTab = ref<'account' | 'agency' | 'integrations' | 'team' | 'clients'>('account')
const {
  getStatus: getGoogleStatus,
  redirectToConnect: redirectToGoogleConnect,
  disconnect: disconnectDefaultGoogle,
  getCalendars: getGoogleCalendars,
  selectDashboardCalendars,
} = useAccountGoogle()

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
const googleLoading = ref(false)
const googleActionPending = ref(false)
const googleStatus = ref<AccountGoogleStatus | null>(null)
const googleError = ref('')
const googleCalendarsLoading = ref(false)
const googleCalendars = ref<Array<{ id: string; summary: string; primary?: boolean }>>([])
const selectedCalendarIds = ref<string[]>([])
const calendarSavePending = ref(false)
const calendarSaveMessage = ref('')
const googleFlashMessage = ref('')
const googleFlashClass = ref('border-surface-200 bg-surface-50 text-surface-700')

async function loadGoogleIntegration() {
  googleLoading.value = true
  googleError.value = ''
  try {
    googleStatus.value = await getGoogleStatus()
    selectedCalendarIds.value = (googleStatus.value.calendars ?? []).map((c) => c.id)
    if (googleStatus.value.connected && googleStatus.value.hasCalendarScope) {
      googleCalendarsLoading.value = true
      try {
        const data = await getGoogleCalendars()
        googleCalendars.value = data.calendars ?? []
      } finally {
        googleCalendarsLoading.value = false
      }
    } else {
      googleCalendars.value = []
    }
  } catch (e: unknown) {
    googleError.value = getApiErrorMessage(e, 'Could not load Google integration.')
  } finally {
    googleLoading.value = false
  }
}

function applyGoogleQueryFeedback() {
  const google = typeof route.query.google === 'string' ? route.query.google : ''
  if (!google) return
  activeTab.value = 'integrations'
  if (google === 'connected') {
    googleFlashMessage.value = 'Google connected. Choose calendars below to sync events into the dashboard calendar.'
    googleFlashClass.value = 'border-green-200 bg-green-50 text-green-800'
  } else if (google === 'denied') {
    googleFlashMessage.value = 'Google connection was cancelled.'
    googleFlashClass.value = 'border-amber-200 bg-amber-50 text-amber-900'
  } else if (google === 'notsaved') {
    googleFlashMessage.value =
      'Google auth completed but account tokens could not be saved. Ensure the users collection has a JSON field named default_google_json.'
    googleFlashClass.value = 'border-red-200 bg-red-50 text-red-800'
  } else {
    googleFlashMessage.value = 'Google connection failed. Please try again.'
    googleFlashClass.value = 'border-red-200 bg-red-50 text-red-800'
  }
  // Keep URL clean after surfacing message.
  void router.replace({ path: route.path, query: { ...route.query, google: undefined } })
}

async function connectGoogle() {
  googleActionPending.value = true
  googleError.value = ''
  const res = await redirectToGoogleConnect(true)
  if (!res.ok) {
    googleError.value = res.message
    googleActionPending.value = false
  }
}

async function disconnectGoogle() {
  if (!confirm('Disconnect default Google integration?')) return
  googleActionPending.value = true
  googleError.value = ''
  try {
    await disconnectDefaultGoogle()
    await loadGoogleIntegration()
  } catch (e: unknown) {
    googleError.value = getApiErrorMessage(e, 'Could not disconnect Google.')
  } finally {
    googleActionPending.value = false
  }
}

async function saveCalendarSelection() {
  calendarSavePending.value = true
  calendarSaveMessage.value = ''
  try {
    const byId = new Map(googleCalendars.value.map((c) => [c.id, c.summary]))
    const calendars = selectedCalendarIds.value.map((id) => ({ id, summary: byId.get(id) || id }))
    await selectDashboardCalendars(calendars)
    calendarSaveMessage.value = 'Calendar selection saved.'
    await loadGoogleIntegration()
  } catch (e: unknown) {
    calendarSaveMessage.value = getApiErrorMessage(e, 'Could not save calendars.')
  } finally {
    calendarSavePending.value = false
  }
}

/** Team / clients (agency owner) */
const workspaceLoaded = ref(false)
const workspace = reactive({
  canManageTeam: false,
  members: [] as Array<{
    id: string
    email: string
    name: string
    created?: string
    inviteEmailSentAt?: string
    pending?: boolean
  }>,
  clients: [] as Array<{ id: string; email: string; name: string; siteIds: string[] }>,
  ownerSites: [] as Array<{ id: string; name: string; domain: string }>,
})

const teamPendingMembers = computed(() => workspace.members.filter((m) => m.pending))
const teamActiveMembers = computed(() => workspace.members.filter((m) => !m.pending))

function memberInvitedAtLabel(m: { created?: string; inviteEmailSentAt?: string }): string {
  const sent = m.inviteEmailSentAt
  if (sent && typeof sent === 'string') {
    const d = new Date(sent)
    if (!Number.isNaN(d.getTime())) {
      return `Invite email sent ${d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
    }
  }
  const c = m.created
  if (!c || typeof c !== 'string') return ''
  const d = new Date(c)
  if (Number.isNaN(d.getTime())) return ''
  return `Added ${d.toLocaleDateString(undefined, { dateStyle: 'medium' })}`
}
const memberEmail = ref('')
const memberName = ref('')
const memberInviting = ref(false)
const memberResendId = ref('')
const memberMsg = ref('')
const memberWarn = ref('')
const memberErr = ref('')
const clientEmail = ref('')
const clientName = ref('')
const clientSiteIds = ref<string[]>([])
const clientInviting = ref(false)
const clientMsg = ref('')
const clientWarn = ref('')
const clientErr = ref('')
const editClient = ref<{ id: string; email: string } | null>(null)
const editClientSiteIds = ref<string[]>([])
const savingClientSites = ref(false)
/** null = not owner / unknown; false = owner but env SMTP missing */
const transactionalSmtpReady = ref<boolean | null>(null)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadWorkspace() {
  workspaceLoaded.value = false
  transactionalSmtpReady.value = null
  try {
    const [res, smtpRes] = await Promise.all([
      $fetch<{
        canManageTeam?: boolean
        members?: typeof workspace.members
        clients?: typeof workspace.clients
        ownerSites?: typeof workspace.ownerSites
      }>('/api/account/workspace', { headers: authHeaders() }),
      $fetch<{ applicable?: boolean; transactionalSmtpReady?: boolean }>('/api/account/transactional-smtp-status', {
        headers: authHeaders(),
      }).catch(() => ({ applicable: false as const })),
    ])
    workspace.canManageTeam = !!res.canManageTeam
    workspace.members = res.members ?? []
    workspace.clients = res.clients ?? []
    workspace.ownerSites = res.ownerSites ?? []
    if (smtpRes.applicable) {
      transactionalSmtpReady.value = !!smtpRes.transactionalSmtpReady
    }
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
  memberWarn.value = ''
  memberErr.value = ''
  memberInviting.value = true
  try {
    const res = await $fetch<{ ok?: boolean; emailSent?: boolean; warning?: string }>('/api/account/invite-member', {
      method: 'POST',
      headers: authHeaders(),
      body: { email: memberEmail.value.trim(), name: memberName.value.trim() },
    })
    if (res.emailSent === false && res.warning) {
      memberWarn.value = res.warning
    } else {
      memberMsg.value = 'Invite sent. They’ll appear under “Waiting to join” until they sign in.'
    }
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

async function resendMemberInvite(memberId: string) {
  memberMsg.value = ''
  memberWarn.value = ''
  memberErr.value = ''
  memberResendId.value = memberId
  try {
    const res = await $fetch<{ ok?: boolean; emailSent?: boolean; warning?: string }>('/api/account/invite-member-resend', {
      method: 'POST',
      headers: authHeaders(),
      body: { userId: memberId },
    })
    if (res.emailSent === false && res.warning) {
      memberWarn.value = res.warning
    } else {
      memberMsg.value = 'Invite email sent again.'
    }
    await loadWorkspace()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    memberErr.value = err?.data?.message ?? err?.message ?? 'Could not resend invite'
  } finally {
    memberResendId.value = ''
  }
}

async function inviteClient() {
  clientMsg.value = ''
  clientWarn.value = ''
  clientErr.value = ''
  if (!clientSiteIds.value.length) {
    clientErr.value = 'Select at least one site.'
    return
  }
  clientInviting.value = true
  try {
    const res = await $fetch<{ ok?: boolean; emailSent?: boolean; warning?: string }>('/api/account/invite-client', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        email: clientEmail.value.trim(),
        name: clientName.value.trim(),
        siteIds: clientSiteIds.value,
      },
    })
    if (res.emailSent === false && res.warning) {
      clientWarn.value = res.warning
    } else {
      clientMsg.value = 'Client invited. They can sign in at the login page.'
    }
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

watch(activeTab, (t) => {
  if (t === 'team' || t === 'clients') void loadWorkspace()
})

onMounted(() => {
  applyGoogleQueryFeedback()
  loadAgencyLogoPreview()
  loadBranding()
  void loadGoogleIntegration()
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
      headers: authHeaders(),
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
      headers: authHeaders(),
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
      headers: authHeaders(),
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
      headers: authHeaders(),
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
