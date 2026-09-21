import type PocketBase from 'pocketbase'
import { crmRowOwnedByUser } from '~/server/utils/workspace'

export type CrmBoardRecord = {
  id: string
  user: string
  name: string
  sort_order?: number | null
  is_default?: boolean
  created?: string
  updated?: string
}

export type CrmBoardListRecord = {
  id: string
  user: string
  board: string
  name: string
  sort_order?: number | null
  created?: string
  updated?: string
}

export type CrmBoardCardRecord = {
  id: string
  user: string
  board: string
  list: string
  title: string
  description?: string | null
  client?: string | null
  sort_order?: number | null
  created?: string
  updated?: string
  expand?: {
    client?: {
      id: string
      name?: string
      first_name?: string
      last_name?: string
      name_prefix?: string
      company?: string | null
      email?: string | null
      source?: string | null
      next_step?: string | null
      status?: string
    }
  }
}

function sortByOrder<T extends { sort_order?: number | null; created?: string; name?: string; title?: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const ao = typeof a.sort_order === 'number' ? a.sort_order : Number.MAX_SAFE_INTEGER
    const bo = typeof b.sort_order === 'number' ? b.sort_order : Number.MAX_SAFE_INTEGER
    if (ao !== bo) return ao - bo
    const ac = a.created || ''
    const bc = b.created || ''
    if (ac !== bc) return ac.localeCompare(bc)
    return String(a.name || a.title || '').localeCompare(String(b.name || b.title || ''))
  })
}

export function leadCardTitle(client: {
  name?: string
  first_name?: string
  last_name?: string
  name_prefix?: string
  company?: string | null
}) {
  const firstLast = [client.first_name?.trim(), client.last_name?.trim()].filter(Boolean).join(' ')
  const name = firstLast || client.name?.trim() || ''
  const labeled = [client.name_prefix?.trim(), name].filter(Boolean).join(' ')
  return labeled || client.company?.trim() || 'Untitled lead'
}

/** Ensure workspace has at least one shared board with one list; seed lead cards once. */
export async function ensureDefaultCrmBoard(pb: PocketBase, crmOwnerId: string): Promise<CrmBoardRecord[]> {
  const existing = (await pb.collection('crm_boards').getFullList({
    filter: `user = "${crmOwnerId}"`,
  })) as CrmBoardRecord[]

  if (existing.length) {
    return sortByOrder(existing)
  }

  const board = (await pb.collection('crm_boards').create({
    user: crmOwnerId,
    name: 'Leads',
    sort_order: 0,
    is_default: true,
  })) as CrmBoardRecord

  const list = (await pb.collection('crm_board_lists').create({
    user: crmOwnerId,
    board: board.id,
    name: 'Inbox',
    sort_order: 0,
  })) as CrmBoardListRecord

  const leads = await pb
    .collection('crm_clients')
    .getFullList({
      filter: `user = "${crmOwnerId}" && status = "lead"`,
      sort: '-updated',
    })
    .catch(() => [])

  let order = 0
  for (const lead of leads as Array<Parameters<typeof leadCardTitle>[0] & { id: string }>) {
    await pb.collection('crm_board_cards').create({
      user: crmOwnerId,
      board: board.id,
      list: list.id,
      title: leadCardTitle(lead),
      client: lead.id,
      sort_order: order++,
      description: null,
    })
  }

  return [board]
}

export async function requireOwnedBoard(pb: PocketBase, boardId: string, crmOwnerId: string): Promise<CrmBoardRecord> {
  const board = (await pb.collection('crm_boards').getOne(boardId)) as CrmBoardRecord
  if (!crmRowOwnedByUser(board as { user?: unknown }, crmOwnerId)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  return board
}

export async function requireOwnedList(pb: PocketBase, listId: string, crmOwnerId: string): Promise<CrmBoardListRecord> {
  const list = (await pb.collection('crm_board_lists').getOne(listId)) as CrmBoardListRecord
  if (!crmRowOwnedByUser(list as { user?: unknown }, crmOwnerId)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  return list
}

export async function requireOwnedCard(pb: PocketBase, cardId: string, crmOwnerId: string): Promise<CrmBoardCardRecord> {
  const card = (await pb.collection('crm_board_cards').getOne(cardId)) as CrmBoardCardRecord
  if (!crmRowOwnedByUser(card as { user?: unknown }, crmOwnerId)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  return card
}

export async function loadBoardDetail(pb: PocketBase, boardId: string, crmOwnerId: string) {
  const board = await requireOwnedBoard(pb, boardId, crmOwnerId)
  const lists = sortByOrder(
    (await pb.collection('crm_board_lists').getFullList({
      filter: `board = "${boardId}" && user = "${crmOwnerId}"`,
    })) as CrmBoardListRecord[],
  )
  const cards = sortByOrder(
    (await pb.collection('crm_board_cards').getFullList({
      filter: `board = "${boardId}" && user = "${crmOwnerId}"`,
      expand: 'client',
    })) as CrmBoardCardRecord[],
  )

  const cardsByList: Record<string, CrmBoardCardRecord[]> = {}
  for (const list of lists) cardsByList[list.id] = []
  for (const card of cards) {
    if (!cardsByList[card.list]) cardsByList[card.list] = []
    cardsByList[card.list].push(card)
  }

  return {
    board,
    lists: lists.map((list) => ({
      ...list,
      cards: cardsByList[list.id] || [],
    })),
  }
}

export { sortByOrder }
