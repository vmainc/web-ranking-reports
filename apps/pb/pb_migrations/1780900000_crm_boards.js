/// <reference path="../pb_data/types.d.ts" />
/**
 * Shared Trello-style CRM boards (workspace-owner scoped).
 * Also: node apps/web/scripts/add-crm-boards-collections.mjs
 */
migrate((db) => {
  const dao = new Dao(db)

  let users
  try {
    users = dao.findCollectionByNameOrId('users')
  } catch (e) {
    users = dao.findCollectionByNameOrId('_pb_users_auth_')
  }
  const clients = dao.findCollectionByNameOrId('crm_clients')

  try {
    dao.findCollectionByNameOrId('crm_boards')
  } catch (e) {
    const boards = new Collection({
      id: 'crmboards0wrr01',
      created: '2026-09-21 12:00:00.000Z',
      updated: '2026-09-21 12:00:00.000Z',
      name: 'crm_boards',
      type: 'base',
      system: false,
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      schema: [
        {
          system: false,
          id: 'crmbuser001',
          name: 'user',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: users.id,
            cascadeDelete: true,
            minSelect: null,
            maxSelect: 1,
            displayFields: null,
          },
        },
        {
          system: false,
          id: 'crmbname001',
          name: 'name',
          type: 'text',
          required: true,
          presentable: false,
          unique: false,
          options: { min: 1, max: 120, pattern: '' },
        },
        {
          system: false,
          id: 'crmbsort001',
          name: 'sort_order',
          type: 'number',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: null, noDecimal: false },
        },
        {
          system: false,
          id: 'crmbdeflt01',
          name: 'is_default',
          type: 'bool',
          required: false,
          presentable: false,
          unique: false,
          options: {},
        },
      ],
      indexes: [
        'CREATE INDEX idx_crm_boards_user ON crm_boards (user)',
      ],
    })
    dao.saveCollection(boards)
  }

  const boardsCol = dao.findCollectionByNameOrId('crm_boards')

  try {
    dao.findCollectionByNameOrId('crm_board_lists')
  } catch (e) {
    const lists = new Collection({
      id: 'crmblists0wrr01',
      created: '2026-09-21 12:00:00.000Z',
      updated: '2026-09-21 12:00:00.000Z',
      name: 'crm_board_lists',
      type: 'base',
      system: false,
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      schema: [
        {
          system: false,
          id: 'crmluser001',
          name: 'user',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: users.id,
            cascadeDelete: true,
            minSelect: null,
            maxSelect: 1,
            displayFields: null,
          },
        },
        {
          system: false,
          id: 'crmlboard01',
          name: 'board',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: boardsCol.id,
            cascadeDelete: true,
            minSelect: null,
            maxSelect: 1,
            displayFields: null,
          },
        },
        {
          system: false,
          id: 'crmlname001',
          name: 'name',
          type: 'text',
          required: true,
          presentable: false,
          unique: false,
          options: { min: 1, max: 120, pattern: '' },
        },
        {
          system: false,
          id: 'crmlsort001',
          name: 'sort_order',
          type: 'number',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: null, noDecimal: false },
        },
      ],
      indexes: [
        'CREATE INDEX idx_crm_board_lists_board ON crm_board_lists (board)',
      ],
    })
    dao.saveCollection(lists)
  }

  const listsCol = dao.findCollectionByNameOrId('crm_board_lists')

  try {
    dao.findCollectionByNameOrId('crm_board_cards')
  } catch (e) {
    const cards = new Collection({
      id: 'crmbcards0wrr01',
      created: '2026-09-21 12:00:00.000Z',
      updated: '2026-09-21 12:00:00.000Z',
      name: 'crm_board_cards',
      type: 'base',
      system: false,
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      schema: [
        {
          system: false,
          id: 'crmcuser001',
          name: 'user',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: users.id,
            cascadeDelete: true,
            minSelect: null,
            maxSelect: 1,
            displayFields: null,
          },
        },
        {
          system: false,
          id: 'crmcboard01',
          name: 'board',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: boardsCol.id,
            cascadeDelete: true,
            minSelect: null,
            maxSelect: 1,
            displayFields: null,
          },
        },
        {
          system: false,
          id: 'crmclist001',
          name: 'list',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: listsCol.id,
            cascadeDelete: true,
            minSelect: null,
            maxSelect: 1,
            displayFields: null,
          },
        },
        {
          system: false,
          id: 'crmctitle01',
          name: 'title',
          type: 'text',
          required: true,
          presentable: false,
          unique: false,
          options: { min: 1, max: 255, pattern: '' },
        },
        {
          system: false,
          id: 'crmcdesc001',
          name: 'description',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 5000, pattern: '' },
        },
        {
          system: false,
          id: 'crmccli001',
          name: 'client',
          type: 'relation',
          required: false,
          presentable: false,
          unique: false,
          options: {
            collectionId: clients.id,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null,
          },
        },
        {
          system: false,
          id: 'crmcsort001',
          name: 'sort_order',
          type: 'number',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: null, noDecimal: false },
        },
      ],
      indexes: [
        'CREATE INDEX idx_crm_board_cards_board ON crm_board_cards (board)',
        'CREATE INDEX idx_crm_board_cards_list ON crm_board_cards (list)',
      ],
    })
    dao.saveCollection(cards)
  }
}, (db) => {
  const dao = new Dao(db)
  for (const name of ['crm_board_cards', 'crm_board_lists', 'crm_boards']) {
    try {
      const col = dao.findCollectionByNameOrId(name)
      dao.deleteCollection(col)
    } catch (e) {}
  }
})
