<template>
  <section class="rounded-xl border border-slate-700/60 bg-slate-900/50 p-5 shadow-lg ring-1 ring-white/[0.03]">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-white">Tasks & Calendar</h2>
        <p class="mt-0.5 text-sm text-slate-400">Open tasks plus selected Google calendar events.</p>
      </div>
      <NuxtLink to="/to-do" class="shrink-0 text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline">To Do →</NuxtLink>
    </div>

    <div v-if="pending" class="py-10 text-center text-sm text-slate-500">Loading tasks…</div>

    <div v-else class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700/80"
            aria-label="Previous month"
            @click="prevMonth"
          >
            ←
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700/80"
            aria-label="Next month"
            @click="nextMonth"
          >
            →
          </button>
        </div>
        <div class="inline-flex rounded-lg border border-slate-600 bg-slate-800/80 p-1">
          <button
            v-for="mode in viewModes"
            :key="mode.value"
            type="button"
            class="rounded-md px-3 py-1.5 text-xs font-semibold transition"
            :class="
              viewMode === mode.value
                ? 'bg-gradient-to-r from-[#22c55e] to-[#3b82f6] text-slate-950 shadow-sm'
                : 'text-slate-300 hover:bg-slate-700/80'
            "
            @click="setViewMode(mode.value)"
          >
            {{ mode.label }}
          </button>
        </div>
        <p class="text-base font-semibold text-white">{{ monthLabel }}</p>
        <button
          type="button"
          class="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-300 hover:bg-blue-500/20"
          @click="goToday"
        >
          Today
        </button>
      </div>
      <p class="text-xs text-slate-500">
        <span class="inline-block rounded bg-blue-500/15 px-1.5 py-0.5 text-blue-300">Google</span>
        <span class="mx-1">and</span>
        <span class="inline-block rounded bg-slate-700/80 px-1.5 py-0.5 text-slate-300">To Do</span>
        items are merged by date.
      </p>

      <div class="overflow-x-auto">
        <div
          class="grid gap-px rounded-lg border border-slate-700 bg-slate-700"
          :class="[
            calendarCols === 7 ? 'min-w-[640px] grid-cols-7' : 'grid-cols-1',
          ]"
        >
          <div
            v-for="wd in weekdayLabels"
            :key="wd"
            class="bg-slate-800 px-1 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            {{ wd }}
          </div>
          <div
            v-for="(cell, idx) in flatCells"
            :key="idx"
            class="min-h-[5.5rem] cursor-pointer bg-slate-900/80 p-1 transition hover:bg-slate-800 sm:min-h-[6.5rem] sm:p-1.5"
            :class="[
              !cell.inMonth ? 'bg-slate-950/60 text-slate-500' : '',
              cell.isToday ? 'ring-1 ring-inset ring-blue-400/70' : '',
              selectedDayKey === cell.dayKey ? 'ring-2 ring-inset ring-blue-500 bg-blue-500/10' : '',
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
                :class="cell.isToday ? 'bg-gradient-to-r from-[#22c55e] to-[#3b82f6] text-slate-950' : cell.inMonth ? 'text-slate-200' : 'text-slate-500'"
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
              <li v-if="cell.overflow > 0" class="text-[10px] text-slate-500 sm:text-xs">+{{ cell.overflow }} more</li>
            </ul>
          </div>
        </div>
      </div>

      <div v-if="selectedDayDetails" class="rounded-xl border border-slate-700/60 bg-slate-950/50 p-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-semibold text-white">{{ selectedDayDetails.label }}</h3>
            <p class="text-xs text-slate-400">
              {{ selectedDayDetails.entries.length }} item{{ selectedDayDetails.entries.length === 1 ? '' : 's' }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700/80"
            @click="selectedDayKey = null"
          >
            Close
          </button>
        </div>

        <div v-if="selectedDayDetails.entries.length" class="space-y-2">
          <div
            v-for="entry in selectedDayDetails.entries"
            :key="entry.id"
            class="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-white">{{ entry.title }}</p>
                <p class="mt-1 text-xs text-slate-400">{{ entry.tooltip }}</p>
              </div>
              <span
                class="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium"
                :style="entry.kind === 'google' ? { backgroundColor: hexToRgba(entry.calendarColor || '#2563eb', 0.18), color: '#0f172a' } : undefined"
                :class="entry.kind === 'google' ? '' : 'bg-slate-700/80 text-slate-300'"
              >
                {{ entry.kind === 'google' ? (entry.calendarLabel || 'Google') : 'To Do' }}
              </span>
            </div>
            <div v-if="entry.to" class="mt-2">
              <NuxtLink :to="entry.to" class="text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline">Open</NuxtLink>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-slate-500">No items for this day.</p>
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

type ViewMode = 'day' | 'week' | 'month'
const viewMode = ref<ViewMode>('month')
const viewDate = ref(new Date())
const viewModes: Array<{ value: ViewMode; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  out.setDate(out.getDate() - out.getDay())
  return out
}

const monthLabel = computed(() => {
  if (viewMode.value === 'day') {
    return viewDate.value.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }
  if (viewMode.value === 'week') {
    const start = startOfWeek(viewDate.value)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  return viewDate.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
})

const weekdayLabels = computed(() => {
  if (viewMode.value === 'day') {
    return [viewDate.value.toLocaleDateString(undefined, { weekday: 'short' })]
  }
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
})

const calendarCols = computed(() => (viewMode.value === 'day' ? 1 : 7))

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
  const y = viewDate.value.getFullYear()
  const m = viewDate.value.getMonth()
  let start: Date
  let count = 42
  if (viewMode.value === 'day') {
    start = new Date(viewDate.value)
    start.setHours(0, 0, 0, 0)
    count = 1
  } else if (viewMode.value === 'week') {
    start = startOfWeek(viewDate.value)
    count = 7
  } else {
    const first = new Date(y, m, 1)
    start = new Date(first)
    start.setDate(first.getDate() - first.getDay())
    count = 42
  }

  const today = new Date()
  const cells: Cell[] = []
  const cur = new Date(start)
  for (let i = 0; i < count; i++) {
    const inMonth = viewMode.value === 'month' ? cur.getMonth() === m && cur.getFullYear() === y : true
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
  const d = new Date(viewDate.value)
  if (viewMode.value === 'day') d.setDate(d.getDate() - 1)
  else if (viewMode.value === 'week') d.setDate(d.getDate() - 7)
  else d.setMonth(d.getMonth() - 1)
  viewDate.value = d
}

function nextMonth() {
  const d = new Date(viewDate.value)
  if (viewMode.value === 'day') d.setDate(d.getDate() + 1)
  else if (viewMode.value === 'week') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  viewDate.value = d
}

function goToday() {
  const now = new Date()
  viewDate.value = now
  selectedDayKey.value = localYmd(now)
}

function setViewMode(mode: ViewMode) {
  viewMode.value = mode
  if (mode === 'day') {
    selectedDayKey.value = localYmd(viewDate.value)
  }
}

function toggleDay(dayKey: string) {
  selectedDayKey.value = selectedDayKey.value === dayKey ? null : dayKey
}
</script>
