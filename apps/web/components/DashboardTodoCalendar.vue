<template>
  <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-card">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-surface-900">Tasks</h2>
        <p class="mt-0.5 text-sm text-surface-500">Open tasks by due date on the calendar.</p>
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
            class="min-h-[5.5rem] bg-white p-1 sm:min-h-[6.5rem] sm:p-1.5"
            :class="[
              !cell.inMonth ? 'bg-surface-50/80 text-surface-400' : '',
              cell.isToday ? 'ring-1 ring-inset ring-primary-400' : '',
            ]"
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
                  :to="entry.to"
                  class="block truncate rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight sm:text-xs"
                  :class="entryClass(entry)"
                  :title="entry.tooltip"
                >
                  {{ entry.title }}
                </NuxtLink>
              </li>
              <li v-if="cell.overflow > 0" class="text-[10px] text-surface-500 sm:text-xs">+{{ cell.overflow }} more</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TodoTask } from '~/types'

const props = defineProps<{
  tasks: TodoTask[]
  pending: boolean
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

const MAX_VISIBLE = 3

type CalendarEntry = {
  id: string
  to: string
  title: string
  tooltip: string
  kind: 'todo'
  priority?: TodoTask['priority']
}

type Cell = {
  dayNum: number
  inMonth: boolean
  isToday: boolean
  visible: CalendarEntry[]
  overflow: number
}

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
    const list = taskEntries
    const visible = list.slice(0, MAX_VISIBLE)
    const overflow = Math.max(0, list.length - MAX_VISIBLE)
    cells.push({
      dayNum: cur.getDate(),
      inMonth,
      isToday,
      visible,
      overflow,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return cells
})

function priorityBorderClass(p: TodoTask['priority']): string {
  if (p === 'high') return 'border-l-red-500'
  if (p === 'low') return 'border-l-surface-300'
  return 'border-l-amber-500'
}

function entryClass(entry: CalendarEntry): string {
  return `bg-surface-50/90 text-surface-800 hover:bg-primary-50 ${priorityBorderClass(entry.priority ?? 'med')}`
}

function taskTooltip(t: TodoTask): string {
  const site = t.expand?.site?.name?.trim()
  const bits = [t.title, site, `Due ${localYmd(new Date(t.due_at))}`].filter(Boolean)
  return bits.join(' · ')
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
</script>
