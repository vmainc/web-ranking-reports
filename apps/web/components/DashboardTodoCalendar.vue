<template>
  <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-card">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-surface-900">Tasks & Calendar</h2>
        <p class="mt-0.5 text-sm text-surface-500">Open tasks plus selected Google calendar events.</p>
      </div>
      <NuxtLink to="/to-do" class="shrink-0 text-sm font-medium text-primary-600 hover:underline">To Do →</NuxtLink>
    </div>

    <div v-if="pending" class="py-10 text-center text-sm text-surface-500">Loading tasks…</div>

    <div v-else class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-50"
            aria-label="Previous month"
            @click="prevMonth"
          >
            ←
          </button>
          <button
            type="button"
            class="rounded-lg border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-50"
            aria-label="Next month"
            @click="nextMonth"
          >
            →
          </button>
        </div>
        <p class="text-base font-semibold text-surface-900">{{ monthLabel }}</p>
        <button
          type="button"
          class="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-800 hover:bg-primary-100"
          @click="goToday"
        >
          Today
        </button>
      </div>
      <p class="text-xs text-surface-500">
        <span class="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-blue-800">Google</span>
        <span class="mx-1">and</span>
        <span class="inline-block rounded bg-surface-100 px-1.5 py-0.5 text-surface-700">To Do</span>
        items are merged by date.
      </p>

      <div class="overflow-x-auto">
        <div class="grid min-w-[640px] grid-cols-7 gap-px rounded-lg border border-surface-200 bg-surface-200">
          <div
            v-for="wd in weekdayLabels"
            :key="wd"
            class="bg-surface-50 px-1 py-2 text-center text-xs font-semibold uppercase tracking-wide text-surface-500"
          >
            {{ wd }}
          </div>
          <div
            v-for="(cell, idx) in flatCells"
            :key="idx"
            class="min-h-[5.5rem] cursor-pointer bg-white p-1 transition hover:bg-surface-50 sm:min-h-[6.5rem] sm:p-1.5"
            :class="[
              !cell.inMonth ? 'bg-surface-50/80 text-surface-400' : '',
              cell.isToday ? 'ring-1 ring-inset ring-primary-400' : '',
              selectedDayKey === cell.dayKey ? 'ring-2 ring-inset ring-primary-500 bg-primary-50/40' : '',
            ]"
            role="button"
            tabindex="0"
            :aria-label="`Open ${cell.label}`"
            @click="toggleDay(cell.dayKey)"
            @keydown.enter.prevent="toggleDay(cell.dayKey)"
            @keydown.space.prevent="toggleDay(cell.dayKey)"
          >
            <div class="flex justify-end">
              <span
                class="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded text-xs font-medium"
                :class="cell.isToday ? 'bg-primary-600 text-white' : cell.inMonth ? 'text-surface-800' : 'text-surface-400'"
              >
                {{ cell.dayNum }}
              </span>
            </div>
            <ul class="mt-1 space-y-0.5">
              <li v-for="entry in cell.visible" :key="entry.id">
                <NuxtLink
                  v-if="entry.to"
                  :to="entry.to"
                  class="block truncate rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight sm:text-xs"
                  :class="entryClass(entry)"
                  :style="entryStyle(entry)"
                  :title="entry.tooltip"
                >
                  {{ entry.title }}
                </NuxtLink>
                <div
                  v-else
                  class="block truncate rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight sm:text-xs"
                  :class="entryClass(entry)"
                  :style="entryStyle(entry)"
                  :title="entry.tooltip"
                >
                  {{ entry.title }}
                </div>
              </li>
              <li v-if="cell.overflow > 0" class="text-[10px] text-surface-500 sm:text-xs">+{{ cell.overflow }} more</li>
            </ul>
          </div>
        </div>
      </div>

      <div v-if="selectedDayDetails" class="rounded-xl border border-surface-200 bg-surface-50 p-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-semibold text-surface-900">{{ selectedDayDetails.label }}</h3>
            <p class="text-xs text-surface-500">
              {{ selectedDayDetails.entries.length }} item{{ selectedDayDetails.entries.length === 1 ? '' : 's' }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-xs font-medium text-surface-700 hover:bg-surface-100"
            @click="selectedDayKey = null"
          >
            Close
          </button>
        </div>

        <div v-if="selectedDayDetails.entries.length" class="space-y-2">
          <div
            v-for="entry in selectedDayDetails.entries"
            :key="entry.id"
            class="rounded-lg border border-surface-200 bg-white p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-surface-900">{{ entry.title }}</p>
                <p class="mt-1 text-xs text-surface-500">{{ entry.tooltip }}</p>
              </div>
              <span
                class="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium"
                :style="entry.kind === 'google' ? { backgroundColor: hexToRgba(entry.calendarColor || '#2563eb', 0.18), color: '#0f172a' } : undefined"
                :class="entry.kind === 'google' ? '' : 'bg-surface-100 text-surface-700'"
              >
                {{ entry.kind === 'google' ? (entry.calendarLabel || 'Google') : 'To Do' }}
              </span>
            </div>
            <div v-if="entry.to" class="mt-2">
              <NuxtLink :to="entry.to" class="text-xs font-medium text-primary-600 hover:underline">Open</NuxtLink>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-surface-500">No items for this day.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TodoTask } from '~/types'

const props = defineProps<{
  tasks: TodoTask[]
  pending: boolean
  googleEvents?: Array<{
    id: string
    summary: string
    start: string
    end: string
    calendarId: string
    calendarLabel: string
    calendarColor?: string
  }>
}>()

const toDoLink = '/to-do'

/** Viewed month (any day in that month — we read month/year only). */
const viewMonth = ref(new Date())

const monthLabel = computed(() =>
  viewMonth.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
)

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function localYmd(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function taskDueKey(t: TodoTask): string | null {
  if (!t.due_at?.trim()) return null
  const raw = t.due_at.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const d = new Date(t.due_at)
  if (Number.isNaN(d.getTime())) return null
  return localYmd(d)
}

const tasksByDay = computed(() => {
  const map = new Map<string, TodoTask[]>()
  for (const t of props.tasks) {
    if (t.status !== 'open') continue
    const key = taskDueKey(t)
    if (!key) continue
    const arr = map.get(key) ?? []
    arr.push(t)
    map.set(key, arr)
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => a.title.localeCompare(b.title))
  }
  return map
})

function tasksForDay(d: Date): TodoTask[] {
  return tasksByDay.value.get(localYmd(d)) ?? []
}

function parseDayKey(raw: string): string | null {
  const s = String(raw || '').trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return localYmd(d)
}

function addDays(ymd: string, n: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10))
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return localYmd(dt)
}

function googleEventDayKeys(e: { start: string; end: string }): string[] {
  const startKey = parseDayKey(e.start)
  if (!startKey) return []
  const isAllDay = !String(e.start).includes('T')
  if (!isAllDay) return [startKey]
  const endKeyRaw = parseDayKey(e.end)
  if (!endKeyRaw) return [startKey]
  const endInclusive = addDays(endKeyRaw, -1)
  if (!endInclusive || endInclusive < startKey) return [startKey]
  const out: string[] = []
  let cur = startKey
  while (cur <= endInclusive) {
    out.push(cur)
    const next = addDays(cur, 1)
    if (!next) break
    cur = next
  }
  return out
}

const googleByDay = computed(() => {
  const map = new Map<string, Array<NonNullable<typeof props.googleEvents>[number]>>()
  const list = props.googleEvents ?? []
  for (const e of list) {
    for (const key of googleEventDayKeys(e)) {
      const arr = map.get(key) ?? []
      arr.push(e)
      map.set(key, arr)
    }
  }
  return map
})

function googleEventsForDay(d: Date) {
  return googleByDay.value.get(localYmd(d)) ?? []
}

const MAX_VISIBLE = 3

type CalendarEntry = {
  id: string
  to?: string
  title: string
  tooltip: string
  kind: 'todo' | 'google'
  priority?: TodoTask['priority']
  calendarLabel?: string
  isAllDay?: boolean
  calendarColor?: string
}

type Cell = {
  dayKey: string
  label: string
  dayNum: number
  inMonth: boolean
  isToday: boolean
  entries: CalendarEntry[]
  visible: CalendarEntry[]
  overflow: number
}

const selectedDayKey = ref<string | null>(null)

const flatCells = computed((): Cell[] => {
  const y = viewMonth.value.getFullYear()
  const m = viewMonth.value.getMonth()
  const first = new Date(y, m, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())

  const today = new Date()
  const cells: Cell[] = []
  const cur = new Date(start)
  for (let i = 0; i < 42; i++) {
    const inMonth = cur.getMonth() === m && cur.getFullYear() === y
    const isToday =
      cur.getDate() === today.getDate() &&
      cur.getMonth() === today.getMonth() &&
      cur.getFullYear() === today.getFullYear()
    const taskEntries: CalendarEntry[] = tasksForDay(cur).map((t) => ({
      id: `todo:${t.id}`,
      to: toDoLink,
      title: t.title,
      tooltip: taskTooltip(t),
      kind: 'todo',
      priority: t.priority,
    }))
    const googleEntries: CalendarEntry[] = googleEventsForDay(cur).map((e) => ({
      id: `google:${e.id}:${localYmd(cur)}`,
      title: e.summary,
      tooltip: googleTooltip(e),
      kind: 'google',
      calendarLabel: e.calendarLabel,
      isAllDay: !e.start.includes('T'),
      calendarColor: e.calendarColor,
    }))
    const dayKey = localYmd(cur)
    const list = [...googleEntries, ...taskEntries]
    const visible = list.slice(0, MAX_VISIBLE)
    const overflow = Math.max(0, list.length - MAX_VISIBLE)
    cells.push({
      dayKey,
      label: cur.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      dayNum: cur.getDate(),
      inMonth,
      isToday,
      entries: list,
      visible,
      overflow,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return cells
})

const selectedDayDetails = computed(() => {
  if (!selectedDayKey.value) return null
  return flatCells.value.find((cell) => cell.dayKey === selectedDayKey.value) ?? null
})

function priorityBorderClass(p: TodoTask['priority']): string {
  if (p === 'high') return 'border-l-red-500'
  if (p === 'low') return 'border-l-surface-300'
  return 'border-l-amber-500'
}

function entryClass(entry: CalendarEntry): string {
  if (entry.kind === 'google') {
    return 'border-l-2 text-surface-900 hover:brightness-95'
  }
  return `bg-surface-50/90 text-surface-800 hover:bg-primary-50 ${priorityBorderClass(entry.priority ?? 'med')}`
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return `rgba(37, 99, 235, ${alpha})`
  const n = parseInt(raw, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function entryStyle(entry: CalendarEntry): Record<string, string> | undefined {
  if (entry.kind !== 'google') return undefined
  const c = entry.calendarColor || '#2563eb'
  return {
    backgroundColor: hexToRgba(c, 0.18),
    borderLeftColor: c,
  }
}

function taskTooltip(t: TodoTask): string {
  const site = t.expand?.site?.name?.trim()
  const due = taskDueKey(t) || t.due_at
  const bits = [t.title, site, `Due ${due}`].filter(Boolean)
  return bits.join(' · ')
}

function googleTooltip(e: { summary: string; start: string; end: string; calendarLabel: string }): string {
  if (!e.start.includes('T')) return `${e.summary} · ${e.calendarLabel} · All day`
  const start = new Date(e.start)
  const end = new Date(e.end)
  const when = Number.isNaN(start.getTime())
    ? e.start
    : `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${start.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })}${Number.isNaN(end.getTime()) ? '' : ` - ${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}`
  return `${e.summary} · ${e.calendarLabel} · ${when}`
}

function prevMonth() {
  const d = new Date(viewMonth.value)
  d.setMonth(d.getMonth() - 1)
  viewMonth.value = d
}

function nextMonth() {
  const d = new Date(viewMonth.value)
  d.setMonth(d.getMonth() + 1)
  viewMonth.value = d
}

function goToday() {
  viewMonth.value = new Date()
}

function toggleDay(dayKey: string) {
  selectedDayKey.value = selectedDayKey.value === dayKey ? null : dayKey
}
</script>
