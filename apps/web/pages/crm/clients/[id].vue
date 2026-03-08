<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <div v-if="pending" class="py-12 text-center text-surface-500">Loading…</div>
    <template v-else-if="client">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-surface-900">{{ client.name }}</h1>
          <p v-if="client.company" class="mt-1 text-surface-600">{{ client.company }}</p>
          <p class="mt-1 text-sm text-surface-500">{{ client.email || client.phone || '—' }}</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="rounded-lg border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-50"
            @click="openEditModal"
          >
            Edit client
          </button>
          <button
            type="button"
            class="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            :disabled="deletePending"
            @click="confirmDelete"
          >
            {{ deletePending ? 'Deleting…' : 'Delete' }}
          </button>
          <NuxtLink to="/crm/clients" class="text-sm font-medium text-surface-600 hover:text-primary-600">← Contacts</NuxtLink>
        </div>
      </div>

      <div class="mb-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <p class="text-xs font-medium uppercase text-surface-500">Status</p>
            <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusClass(client.status)">{{ client.status }}</span>
          </div>
          <div class="sm:col-span-2">
            <p class="text-xs font-medium uppercase text-surface-500">Connected site</p>
            <p v-if="client.expand?.site" class="text-sm font-medium text-surface-900">
              <NuxtLink :to="`/sites/${client.site}`" class="text-primary-600 hover:underline">{{ (client.expand.site as { name?: string }).name || (client.expand.site as { domain?: string }).domain || client.site }}</NuxtLink>
            </p>
            <p v-else-if="client.site" class="text-sm text-surface-600">{{ client.site }}</p>
            <p v-else class="text-sm text-surface-500">None</p>
            <button type="button" class="mt-1 text-xs font-medium text-primary-600 hover:text-primary-700" @click="openEditModal">Change</button>
          </div>
          <div v-if="client.source" class="sm:col-span-2">
            <p class="text-xs font-medium uppercase text-surface-500">Source</p>
            <p class="text-sm text-surface-700">{{ client.source }}</p>
          </div>
          <div v-if="client.next_step" class="sm:col-span-2">
            <p class="text-xs font-medium uppercase text-surface-500">Next step</p>
            <p class="text-sm text-surface-700">{{ client.next_step }}</p>
          </div>
          <div>
            <p class="text-xs font-medium uppercase text-surface-500">Last activity</p>
            <p class="text-sm text-surface-700">{{ client.last_activity_at ? formatDate(client.last_activity_at) : '—' }}</p>
          </div>
          <div v-if="tags.length" class="sm:col-span-2">
            <p class="text-xs font-medium uppercase text-surface-500">Tags</p>
            <div class="mt-1 flex flex-wrap gap-1">
              <span v-for="t in tags" :key="t" class="rounded bg-surface-100 px-2 py-0.5 text-xs text-surface-700">{{ t }}</span>
            </div>
          </div>
        </div>
        <div v-if="client.notes" class="mt-4 border-t border-surface-200 pt-4">
          <p class="text-xs font-medium uppercase text-surface-500">Notes</p>
          <p class="mt-1 whitespace-pre-wrap text-sm text-surface-700">{{ client.notes }}</p>
        </div>
      </div>

      <nav class="mb-4 flex gap-1 border-b border-surface-200">
        <button
          type="button"
          class="border-b-2 px-4 py-3 text-sm font-medium transition"
          :class="tab === 'timeline' ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-600 hover:text-surface-900'"
          @click="tab = 'timeline'"
        >
          Timeline
        </button>
        <button
          type="button"
          class="border-b-2 px-4 py-3 text-sm font-medium transition"
          :class="tab === 'tasks' ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-600 hover:text-surface-900'"
          @click="tab = 'tasks'"
        >
          Tasks
        </button>
        <button
          type="button"
          class="border-b-2 px-4 py-3 text-sm font-medium transition"
          :class="tab === 'deals' ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-600 hover:text-surface-900'"
          @click="tab = 'deals'"
        >
          Proposals
        </button>
        <button
          type="button"
          class="border-b-2 px-4 py-3 text-sm font-medium transition"
          :class="tab === 'outsourcing' ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-600 hover:text-surface-900'"
          @click="tab = 'outsourcing'"
        >
          Outsourcing
        </button>
      </nav>

      <section v-show="tab === 'timeline'" class="space-y-4">
        <div class="flex justify-end">
          <button type="button" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" @click="showActivityModal = true">Log activity</button>
        </div>
        <div v-if="contactPending" class="py-8 text-center text-sm text-surface-500">Loading…</div>
        <ul v-else-if="!contactPoints.length" class="rounded-xl border border-surface-200 bg-white py-8 text-center text-sm text-surface-500">No activity yet.</ul>
        <ul v-else class="space-y-2">
          <li v-for="a in contactPoints" :key="a.id" class="rounded-lg border border-surface-200 bg-white p-4">
            <div class="flex items-center justify-between gap-2">
              <span class="rounded px-2 py-0.5 text-xs font-medium bg-surface-100 text-surface-700">{{ a.kind }}</span>
              <span class="text-sm text-surface-500">{{ formatDate(a.happened_at) }}</span>
            </div>
            <p v-if="a.summary" class="mt-2 text-sm text-surface-700">{{ a.summary }}</p>
          </li>
        </ul>
      </section>

      <section v-show="tab === 'tasks'" class="space-y-4">
        <div class="flex justify-end">
          <button type="button" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" @click="openTaskModal()">Add task</button>
        </div>
        <div v-if="tasksPending" class="py-8 text-center text-sm text-surface-500">Loading…</div>
        <ul v-else-if="!tasks.length" class="rounded-xl border border-surface-200 bg-white py-8 text-center text-sm text-surface-500">No tasks.</ul>
        <ul v-else class="space-y-2">
          <li v-for="t in tasks" :key="t.id" class="flex items-center justify-between rounded-lg border border-surface-200 bg-white p-4">
            <div>
              <p class="font-medium text-surface-900">{{ t.title }}</p>
              <p class="text-sm text-surface-500">Due {{ formatDate(t.due_at) }} · {{ t.priority }} · {{ t.status }}</p>
            </div>
            <button type="button" class="text-sm text-primary-600 hover:underline" @click="toggleTaskStatus(t)">{{ t.status === 'open' ? 'Mark done' : 'Reopen' }}</button>
          </li>
        </ul>
      </section>

      <section v-show="tab === 'deals'" class="space-y-4">
        <div class="flex justify-end">
          <button type="button" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" @click="showDealModal = true">Add proposal</button>
        </div>
        <div v-if="salesPending" class="py-8 text-center text-sm text-surface-500">Loading…</div>
        <ul v-else-if="!sales.length" class="rounded-xl border border-surface-200 bg-white py-8 text-center text-sm text-surface-500">No proposals.</ul>
        <ul v-else class="space-y-2">
          <li v-for="s in sales" :key="s.id" class="flex items-center justify-between rounded-lg border border-surface-200 bg-white p-4">
            <div>
              <p class="font-medium text-surface-900">{{ s.title }}</p>
              <p class="text-sm text-surface-500">{{ formatCurrency(s.amount ?? 0) }} · {{ s.status }}</p>
            </div>
            <select
              :value="s.status"
              class="rounded border border-surface-300 text-sm"
              @change="updateDealStatus(s.id, (s as { status: string })?.status, ($event.target as HTMLSelectElement).value)"
            >
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </li>
        </ul>
      </section>

      <section v-show="tab === 'outsourcing'" class="space-y-4">
        <div class="flex justify-end">
          <button type="button" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" @click="openOutsourcingModal">Add order</button>
        </div>
        <div v-if="outsourcingPending" class="py-8 text-center text-sm text-surface-500">Loading…</div>
        <div v-else-if="!outsourcingList.length" class="rounded-xl border border-surface-200 bg-white py-8 text-center text-sm text-surface-500">
          No outsourcing orders yet. Add Fiverr (or other) orders to track spend per client.
        </div>
        <div v-else class="overflow-hidden rounded-xl border border-surface-200 bg-white">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-surface-200 text-left text-sm">
              <thead class="bg-surface-50">
                <tr>
                  <th class="px-4 py-3 font-medium text-surface-700">Date</th>
                  <th class="px-4 py-3 font-medium text-surface-700">Service</th>
                  <th class="px-4 py-3 font-medium text-surface-700">Order</th>
                  <th class="px-4 py-3 font-medium text-surface-700">Invoice</th>
                  <th class="px-4 py-3 font-medium text-surface-700">Currency</th>
                  <th class="px-4 py-3 font-medium text-surface-700 text-right">Total</th>
                  <th class="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-200">
                <tr v-for="o in outsourcingList" :key="o.id" class="hover:bg-surface-50/50">
                  <td class="px-4 py-3 text-surface-700">{{ formatOutsourcingDate(o.order_date) }}</td>
                  <td class="px-4 py-3 font-medium text-surface-900">{{ o.service }}</td>
                  <td class="px-4 py-3">
                    <a
                      v-if="o.order_id"
                      :href="fiverrOrderUrl(o.order_id)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary-600 hover:underline"
                    >
                      {{ o.order_id }}
                    </a>
                    <span v-else class="text-surface-500">—</span>
                  </td>
                  <td class="px-4 py-3 text-surface-600">{{ o.invoice_id || '—' }}</td>
                  <td class="px-4 py-3 text-surface-600">{{ o.currency || 'USD' }}</td>
                  <td class="px-4 py-3 text-right font-medium text-surface-900">{{ formatOutsourcingCurrency(o.total, o.currency) }}</td>
                  <td class="px-4 py-3">
                    <button
                      type="button"
                      class="text-surface-400 hover:text-red-600"
                      title="Delete"
                      @click="deleteOutsourcingOrder(o)"
                    >
                      <span class="sr-only">Delete</span>
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="outsourcingList.length" class="border-t border-surface-200 px-4 py-2 text-xs text-surface-500">
            Showing {{ outsourcingList.length }} order(s). Fiverr order links open in a new tab.
          </p>
        </div>
      </section>

      <CrmModal v-model="showActivityModal" title="Log activity">
        <form id="activity-form" class="space-y-3" @submit.prevent="saveActivity">
          <div>
            <label class="block text-sm font-medium text-surface-700">Type</label>
            <select v-model="activityForm.kind" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Date *</label>
            <input v-model="activityForm.happened_at" type="datetime-local" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Summary</label>
            <textarea v-model="activityForm.summary" rows="2" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"></textarea>
          </div>
        </form>
        <template #footer>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50" @click="showActivityModal = false">Cancel</button>
            <button type="submit" form="activity-form" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500">Save</button>
          </div>
        </template>
      </CrmModal>

      <CrmModal v-model="showDealModal" title="Add proposal">
        <form id="deal-form" class="space-y-3" @submit.prevent="saveDeal">
          <div>
            <label class="block text-sm font-medium text-surface-700">Title *</label>
            <input v-model="dealForm.title" type="text" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Amount</label>
            <input v-model.number="dealForm.amount" type="number" step="0.01" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
        </form>
        <template #footer>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50" @click="showDealModal = false">Cancel</button>
            <button type="submit" form="deal-form" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500">Save</button>
          </div>
        </template>
      </CrmModal>

      <CrmModal v-model="showTaskModal" title="Add task">
        <form id="task-form" class="space-y-3" @submit.prevent="saveTask">
          <div>
            <label class="block text-sm font-medium text-surface-700">Title *</label>
            <input v-model="taskForm.title" type="text" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Due date *</label>
            <input v-model="taskForm.due_at" type="date" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Priority</label>
            <select v-model="taskForm.priority" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </form>
        <template #footer>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50" @click="showTaskModal = false">Cancel</button>
            <button type="submit" form="task-form" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500">Save</button>
          </div>
        </template>
      </CrmModal>

      <CrmModal v-model="showOutsourcingModal" title="Add outsourcing order">
        <form id="outsourcing-form" class="space-y-3" @submit.prevent="saveOutsourcing">
          <p class="text-sm text-surface-600">Record a Fiverr or other outsourced order for this client.</p>
          <div>
            <label class="block text-sm font-medium text-surface-700">Date *</label>
            <input v-model="outsourcingForm.order_date" type="date" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Service *</label>
            <input v-model="outsourcingForm.service" type="text" required placeholder="e.g. Search Engine Optimization (SEO)" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Order ID</label>
            <input v-model="outsourcingForm.order_id" type="text" placeholder="e.g. FO16E36D1D81" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Invoice ID</label>
            <input v-model="outsourcingForm.invoice_id" type="text" placeholder="e.g. FI17584227794" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-surface-700">Currency</label>
              <select v-model="outsourcingForm.currency" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Total *</label>
              <input v-model.number="outsourcingForm.total" type="number" step="0.01" min="0" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Notes</label>
            <textarea v-model="outsourcingForm.notes" rows="2" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" placeholder="Optional"></textarea>
          </div>
        </form>
        <template #footer>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50" @click="showOutsourcingModal = false">Cancel</button>
            <button type="submit" form="outsourcing-form" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500">Save</button>
          </div>
        </template>
      </CrmModal>

      <CrmModal v-model="showEditModal" title="Edit client">
        <form id="edit-client-form" class="space-y-3" @submit.prevent="saveEditClient">
          <div>
            <label class="block text-sm font-medium text-surface-700">Name *</label>
            <input v-model="editForm.name" type="text" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Email</label>
            <input v-model="editForm.email" type="email" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Phone</label>
            <input v-model="editForm.phone" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Company</label>
            <input v-model="editForm.company" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Status</label>
            <select v-model="editForm.status" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
              <option value="lead">Lead</option>
              <option value="client">Client</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Connected site</label>
            <select v-model="editForm.site" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
              <option value="">None</option>
              <option v-for="s in userSites" :key="s.id" :value="s.id">{{ s.name || s.domain }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Source</label>
            <input v-model="editForm.source" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" placeholder="e.g. Website" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Next step</label>
            <input v-model="editForm.next_step" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Notes</label>
            <textarea v-model="editForm.notes" rows="3" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"></textarea>
          </div>
        </form>
        <template #footer>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50" @click="showEditModal = false">Cancel</button>
            <button type="submit" form="edit-client-form" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" :disabled="editSaving">
              {{ editSaving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </template>
      </CrmModal>
    </template>
    <div v-else class="py-12 text-center text-surface-500">Client not found.</div>
  </div>
</template>

<script setup lang="ts">
import type { CrmClient, CrmContactPoint, CrmSale, CrmTask, CrmOutsourcing } from '~/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const clientId = computed(() => route.params.id as string)
const client = ref<CrmClient | null>(null)
const pending = ref(true)
const tab = ref<'timeline' | 'tasks' | 'deals' | 'outsourcing'>('timeline')

const { contactPoints, pending: contactPending, load: loadContact } = useCrmContactPoints(clientId)
const { sales, pending: salesPending, load: loadSales } = useCrmSales(clientId)
const { tasks, pending: tasksPending, load: loadTasks } = useCrmTasks(clientId)

const outsourcingList = ref<CrmOutsourcing[]>([])
const outsourcingPending = ref(false)
const showOutsourcingModal = ref(false)
const outsourcingForm = reactive({
  order_date: '',
  service: '',
  order_id: '',
  invoice_id: '',
  currency: 'USD',
  total: null as number | null,
  notes: '',
})

const showActivityModal = ref(false)
const showDealModal = ref(false)
const showTaskModal = ref(false)
const showEditModal = ref(false)
const editSaving = ref(false)
const deletePending = ref(false)
const activityForm = reactive({ kind: 'note' as 'call' | 'email' | 'meeting' | 'note', happened_at: '', summary: '' })
const dealForm = reactive({ title: '', amount: null as number | null })
const taskForm = reactive({ title: '', due_at: '', priority: 'med' as 'low' | 'med' | 'high' })
const editForm = reactive({
  name: '',
  email: '',
  phone: '',
  company: '',
  status: 'lead' as 'lead' | 'client' | 'archived',
  site: '' as string,
  source: '',
  next_step: '',
  notes: '',
})
const userSites = ref<Array<{ id: string; name?: string; domain?: string }>>([])

const tags = computed(() => {
  const t = client.value?.tags_json
  return Array.isArray(t) ? t : []
})

function statusClass(s: string) {
  if (s === 'client') return 'bg-green-100 text-green-800'
  if (s === 'lead') return 'bg-amber-100 text-amber-800'
  return 'bg-surface-100 text-surface-600'
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n)
}

function formatOutsourcingDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'short' })
  } catch {
    return iso
  }
}

function formatOutsourcingCurrency(total: number, currency?: string | null) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: (currency || 'USD').trim() || 'USD', minimumFractionDigits: 2 }).format(total)
}

function fiverrOrderUrl(orderId: string) {
  return `https://www.fiverr.com/orders/${encodeURIComponent(orderId.trim())}`
}

async function loadOutsourcing() {
  if (!clientId.value) return
  outsourcingPending.value = true
  try {
    const list = await $fetch<CrmOutsourcing[]>(`/api/crm/outsourcing?clientId=${encodeURIComponent(clientId.value)}`, { headers: authHeaders() })
    outsourcingList.value = list
  } catch {
    outsourcingList.value = []
  } finally {
    outsourcingPending.value = false
  }
}

function openOutsourcingModal() {
  const d = new Date()
  outsourcingForm.order_date = d.toISOString().slice(0, 10)
  outsourcingForm.service = ''
  outsourcingForm.order_id = ''
  outsourcingForm.invoice_id = ''
  outsourcingForm.currency = 'USD'
  outsourcingForm.total = null
  outsourcingForm.notes = ''
  showOutsourcingModal.value = true
}

async function saveOutsourcing() {
  if (outsourcingForm.total == null || Number.isNaN(outsourcingForm.total)) {
    alert('Please enter a total amount.')
    return
  }
  try {
    await $fetch('/api/crm/outsourcing', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        client: clientId.value,
        order_date: outsourcingForm.order_date,
        service: outsourcingForm.service.trim(),
        order_id: outsourcingForm.order_id.trim() || null,
        invoice_id: outsourcingForm.invoice_id.trim() || null,
        currency: outsourcingForm.currency,
        total: Number(outsourcingForm.total),
        notes: outsourcingForm.notes.trim() || null,
      },
    })
    showOutsourcingModal.value = false
    await loadOutsourcing()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to save order')
  }
}

async function deleteOutsourcingOrder(o: CrmOutsourcing) {
  if (!confirm(`Delete this order (${o.service}, ${formatOutsourcingCurrency(o.total, o.currency)})?`)) return
  try {
    await $fetch(`/api/crm/outsourcing/${o.id}`, { method: 'DELETE', headers: authHeaders() })
    await loadOutsourcing()
  } catch {
    alert('Failed to delete')
  }
}

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  return pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}
}

async function loadClient() {
  try {
    client.value = await $fetch<CrmClient>(`/api/crm/clients/${clientId.value}`, { headers: authHeaders() })
  } catch {
    client.value = null
  } finally {
    pending.value = false
  }
}

function openTaskModal() {
  taskForm.title = ''
  taskForm.due_at = new Date().toISOString().slice(0, 10)
  taskForm.priority = 'med'
  showTaskModal.value = true
}

function openEditModal() {
  const c = client.value
  if (!c) return
  editForm.name = c.name ?? ''
  editForm.email = c.email ?? ''
  editForm.phone = c.phone ?? ''
  editForm.company = c.company ?? ''
  editForm.status = c.status === 'client' || c.status === 'archived' ? c.status : 'lead'
  editForm.site = c.site ?? ''
  editForm.source = c.source ?? ''
  editForm.next_step = c.next_step ?? ''
  editForm.notes = c.notes ?? ''
  showEditModal.value = true
}

function confirmDelete() {
  const name = client.value?.name ?? 'this client'
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return
  deleteClient()
}

async function deleteClient() {
  if (deletePending.value) return
  deletePending.value = true
  try {
    await $fetch(`/api/crm/clients/${clientId.value}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    navigateTo('/crm/clients')
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to delete')
  } finally {
    deletePending.value = false
  }
}

async function saveEditClient() {
  if (editSaving.value) return
  editSaving.value = true
  try {
    await $fetch(`/api/crm/clients/${clientId.value}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: {
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        company: editForm.company.trim() || null,
        status: editForm.status,
        site: editForm.site.trim() || null,
        source: editForm.source.trim() || null,
        next_step: editForm.next_step.trim() || null,
        notes: editForm.notes.trim() || null,
      },
    })
    showEditModal.value = false
    await loadClient()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to save')
  } finally {
    editSaving.value = false
  }
}

async function saveActivity() {
  try {
    await $fetch('/api/crm/contact-points', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        client: clientId.value,
        kind: activityForm.kind,
        happened_at: new Date(activityForm.happened_at).toISOString(),
        summary: activityForm.summary || null,
      },
    })
    showActivityModal.value = false
    await loadContact()
    await loadClient()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed')
  }
}

async function saveDeal() {
  try {
    await $fetch('/api/crm/sales', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        client: clientId.value,
        title: dealForm.title,
        amount: dealForm.amount,
        status: 'open',
      },
    })
    showDealModal.value = false
    await loadSales()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed')
  }
}

const pbTasks = usePocketbase()

async function saveTask() {
  try {
    const authId = pbTasks.authStore.model?.id as string | undefined
    if (!authId) throw new Error('Not authenticated')
    let dueAt = taskForm.due_at
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(dueAt)) dueAt = `${dueAt}T12:00:00.000Z`
    await pbTasks.collection('crm_tasks').create({
      user: authId,
      client: clientId.value,
      title: taskForm.title,
      due_at: dueAt,
      priority: taskForm.priority,
      status: 'open',
    })
    showTaskModal.value = false
    await loadTasks()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed')
  }
}

async function toggleTaskStatus(t: CrmTask) {
  try {
    await pbTasks.collection('crm_tasks').update(t.id, {
      status: t.status === 'open' ? 'done' : 'open',
    })
    await loadTasks()
  } catch {
    //
  }
}

async function updateDealStatus(saleId: string, _old: string, newStatus: string) {
  try {
    await $fetch(`/api/crm/sales/${saleId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { status: newStatus as 'open' | 'won' | 'lost' },
    })
    await loadSales()
  } catch {
    //
  }
}

async function loadUserSites() {
  const pb = usePocketbase()
  const uid = pb.authStore.model?.id
  if (!uid) return
  try {
    const list = await pb.collection('sites').getFullList<{ id: string; name?: string; domain?: string }>({ filter: `user = "${uid}"`, sort: '-created' })
    userSites.value = list
  } catch {
    userSites.value = []
  }
}

onMounted(() => {
  loadClient()
  loadContact()
  loadSales()
  loadTasks()
  loadOutsourcing()
  loadUserSites()
  const d = new Date()
  activityForm.happened_at = d.toISOString().slice(0, 16)
})

watch(clientId, () => {
  pending.value = true
  loadClient()
  loadContact()
  loadSales()
  loadTasks()
  loadOutsourcing()
})
</script>
