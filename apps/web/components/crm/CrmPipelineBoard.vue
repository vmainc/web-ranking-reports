<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <select
        v-model="selectedBoardId"
        class="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm text-slate-100"
        @change="onSelectBoard"
      >
        <option v-for="b in boards" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
      <button
        type="button"
        class="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-800"
        @click="showNewBoard = true"
      >
        + New board
      </button>
      <button
        v-if="boards.length > 1"
        type="button"
        class="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
        @click="onDeleteBoard"
      >
        Delete board
      </button>
    </div>

    <div v-if="error" class="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {{ error }}
    </div>

    <div v-if="pending && !board" class="py-16 text-center text-slate-500">Loading board…</div>

    <template v-else-if="board">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <input
          v-model="boardNameDraft"
          class="rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-semibold text-white outline-none hover:border-slate-700 focus:border-slate-500"
          @change="onRenameBoard"
          @keydown.enter.prevent="onRenameBoard"
        />
        <span class="text-xs text-slate-500">Visible to everyone on your team</span>
      </div>

      <div class="-mx-1 flex items-start gap-4 overflow-x-auto px-1 pb-6 pt-1">
        <CrmBoardColumn
          v-for="(list, idx) in lists"
          :key="list.id"
          :list="list"
          :theme-index="idx"
          :can-delete="lists.length > 1"
          @drop="onDrop"
          @add-card="(payload) => onAddCard(list.id, payload)"
          @rename-list="onRenameList"
          @delete-list="onDeleteList"
          @open-card="openCard"
        />

        <div class="w-72 shrink-0">
          <form
            v-if="addingList"
            class="rounded-xl border border-slate-600 bg-slate-900/70 p-3 shadow-lg"
            @submit.prevent="submitNewList"
          >
            <input
              ref="newListInput"
              v-model="newListName"
              class="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none"
              placeholder="Column name"
              @keydown.escape.prevent="addingList = false"
            />
            <div class="mt-2 flex gap-2">
              <button type="submit" class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-500">
                Add column
              </button>
              <button type="button" class="rounded-lg px-3 py-1.5 text-xs text-slate-400" @click="addingList = false">Cancel</button>
            </div>
          </form>
          <button
            v-else
            type="button"
            class="w-full rounded-xl border border-dashed border-slate-600/80 bg-slate-900/30 px-4 py-8 text-sm font-medium text-slate-400 transition hover:border-slate-500 hover:bg-slate-900/60 hover:text-slate-200"
            @click="startAddList"
          >
            + Add a column
          </button>
        </div>
      </div>
    </template>

    <CrmModal v-model="showNewBoard" title="New shared board">
      <form id="new-board-form" class="space-y-3" @submit.prevent="submitNewBoard">
        <div>
          <label class="block text-sm font-medium text-surface-700">Board name</label>
          <input
            v-model="newBoardName"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
            placeholder="e.g. Q4 outreach"
          />
        </div>
        <p class="text-xs text-surface-500">Starts with one Inbox column. Everyone on your team can see and edit it.</p>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm" @click="showNewBoard = false">Cancel</button>
          <button type="submit" form="new-board-form" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
            Create board
          </button>
        </div>
      </template>
    </CrmModal>

    <CrmModal v-model="showCardModal" :title="editingCard?.title || 'Card'">
      <form v-if="editingCard" id="edit-card-form" class="space-y-3" @submit.prevent="saveCard">
        <div>
          <label class="block text-sm font-medium text-surface-700">Title</label>
          <input v-model="cardForm.title" type="text" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Notes</label>
          <textarea v-model="cardForm.description" rows="4" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <p v-if="editingCard.client" class="text-sm text-surface-600">
          Linked contact —
          <NuxtLink :to="`/crm/clients/${editingCard.client}`" class="font-medium text-primary-600 hover:underline">
            open profile
          </NuxtLink>
        </p>
      </form>
      <template #footer>
        <div class="flex w-full items-center justify-between gap-2">
          <button type="button" class="text-sm text-rose-600 hover:underline" @click="onDeleteCard">Delete card</button>
          <div class="flex gap-2">
            <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm" @click="showCardModal = false">Close</button>
            <button type="submit" form="edit-card-form" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
          </div>
        </div>
      </template>
    </CrmModal>
  </div>
</template>

<script setup lang="ts">
import type { CrmBoardCard } from '~/types'

const {
  boards,
  activeBoardId,
  board,
  lists,
  pending,
  error,
  loadBoards,
  loadBoard,
  createBoard,
  renameBoard,
  deleteBoard,
  addList,
  renameList,
  deleteList,
  addCard,
  moveCard,
  updateCard,
  deleteCard,
} = useCrmBoards()

const selectedBoardId = ref('')
const boardNameDraft = ref('')
const showNewBoard = ref(false)
const newBoardName = ref('')
const addingList = ref(false)
const newListName = ref('')
const newListInput = ref<HTMLInputElement | null>(null)
const showCardModal = ref(false)
const editingCard = ref<CrmBoardCard | null>(null)
const cardForm = reactive({ title: '', description: '' })

watch(
  () => board.value,
  (b) => {
    selectedBoardId.value = b?.id || ''
    boardNameDraft.value = b?.name || ''
  },
  { immediate: true },
)

async function onSelectBoard() {
  if (!selectedBoardId.value) return
  try {
    await loadBoard(selectedBoardId.value)
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to open board')
  }
}

async function submitNewBoard() {
  const name = newBoardName.value.trim()
  if (!name) return
  try {
    await createBoard(name)
    showNewBoard.value = false
    newBoardName.value = ''
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to create board')
  }
}

async function onRenameBoard() {
  const name = boardNameDraft.value.trim()
  if (!board.value || !name || name === board.value.name) return
  try {
    await renameBoard(board.value.id, name)
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to rename')
    boardNameDraft.value = board.value.name
  }
}

async function onDeleteBoard() {
  if (!board.value || boards.value.length <= 1) return
  if (!confirm(`Delete board “${board.value.name}”? Columns and cards on it will be removed.`)) return
  try {
    await deleteBoard(board.value.id)
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to delete board')
  }
}

function startAddList() {
  addingList.value = true
  newListName.value = ''
  nextTick(() => newListInput.value?.focus())
}

async function submitNewList() {
  const name = newListName.value.trim() || 'New list'
  try {
    await addList(name)
    addingList.value = false
    newListName.value = ''
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to add column')
  }
}

async function onRenameList(listId: string, name: string) {
  try {
    await renameList(listId, name)
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to rename column')
  }
}

async function onDeleteList(listId: string) {
  if (!confirm('Delete this column and its cards?')) return
  try {
    await deleteList(listId)
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to delete column')
  }
}

async function onAddCard(listId: string, payload: { title: string; create_contact: boolean }) {
  try {
    await addCard(listId, payload)
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to add card')
  }
}

async function onDrop(cardId: string, listId: string) {
  const current = lists.value.flatMap((l) => l.cards || []).find((c) => c.id === cardId)
  if (current?.list === listId) return
  try {
    await moveCard(cardId, listId)
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to move card')
  }
}

function openCard(card: CrmBoardCard) {
  editingCard.value = card
  cardForm.title = card.title
  cardForm.description = card.description || ''
  showCardModal.value = true
}

async function saveCard() {
  if (!editingCard.value) return
  try {
    await updateCard(editingCard.value.id, {
      title: cardForm.title.trim(),
      description: cardForm.description.trim() || null,
    })
    showCardModal.value = false
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to save card')
  }
}

async function onDeleteCard() {
  if (!editingCard.value) return
  if (!confirm('Delete this card?')) return
  try {
    await deleteCard(editingCard.value.id)
    showCardModal.value = false
    editingCard.value = null
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? 'Failed to delete card')
  }
}

onMounted(() => {
  void loadBoards()
})

watch(activeBoardId, (id) => {
  if (id) selectedBoardId.value = id
})
</script>
