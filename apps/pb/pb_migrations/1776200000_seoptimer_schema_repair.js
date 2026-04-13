/// <reference path="../pb_data/types.d.ts" />
/**
 * Idempotent repair: ensures users.seoptimer_webhook_key and seoptimer_leads exist.
 * Use when 1776100000 is already listed in _migrations but the DB was restored or drifted.
 */
migrate((db) => {
  const dao = new Dao(db)

  const users = dao.findCollectionByNameOrId('_pb_users_auth_')
  if (!users.schema.getFieldByName('seoptimer_webhook_key')) {
    users.schema.addField(
      new SchemaField({
        system: false,
        id: 'sotmwhky1',
        name: 'seoptimer_webhook_key',
        type: 'text',
        required: false,
        presentable: false,
        unique: true,
        options: {
          min: null,
          max: 200,
          pattern: '',
        },
      }),
    )
    dao.saveCollection(users)
  }

  try {
    dao.findCollectionByNameOrId('seoptimer_leads')
    return
  } catch (_) {
    // create collection
  }

  let crmClientsId
  try {
    crmClientsId = dao.findCollectionByNameOrId('crm_clients').id
  } catch (_) {
    throw new Error(
      'seoptimer repair: collection "crm_clients" not found — create CRM collections first, then restart PocketBase.',
    )
  }

  const collection = new Collection({
    id: 'se0pt1m3rlead01',
    created: '2026-04-11 12:00:00.000Z',
    updated: '2026-04-11 12:00:00.000Z',
    name: 'seoptimer_leads',
    type: 'base',
    system: false,
    schema: [
      {
        system: false,
        id: 'sotmusr01',
        name: 'user',
        type: 'relation',
        required: true,
        presentable: false,
        unique: false,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: null,
        },
      },
      {
        system: false,
        id: 'sotmname1',
        name: 'name',
        type: 'text',
        required: false,
        presentable: true,
        unique: false,
        options: { min: null, max: 500, pattern: '' },
      },
      {
        system: false,
        id: 'sotmemail1',
        name: 'email',
        type: 'text',
        required: false,
        presentable: true,
        unique: false,
        options: { min: null, max: 500, pattern: '' },
      },
      {
        system: false,
        id: 'sotmphone1',
        name: 'phone',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 120, pattern: '' },
      },
      {
        system: false,
        id: 'sotmweb01',
        name: 'website',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 2000, pattern: '' },
      },
      {
        system: false,
        id: 'sotmaudit',
        name: 'audit_url',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 2000, pattern: '' },
      },
      {
        system: false,
        id: 'sotmpdf01',
        name: 'pdf_report_url',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 2000, pattern: '' },
      },
      {
        system: false,
        id: 'sotmnotes',
        name: 'notes',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 10000, pattern: '' },
      },
      {
        system: false,
        id: 'sotmpayld',
        name: 'payload_json',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: { maxSize: 500000 },
      },
      {
        system: false,
        id: 'sotmcrm01',
        name: 'crm_client',
        type: 'relation',
        required: false,
        presentable: false,
        unique: false,
        options: {
          collectionId: crmClientsId,
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: null,
        },
      },
      {
        system: false,
        id: 'sotmconv1',
        name: 'converted_at',
        type: 'date',
        required: false,
        presentable: false,
        unique: false,
        options: { min: '', max: '' },
      },
      {
        system: false,
        id: 'sotmrecv1',
        name: 'received_at',
        type: 'date',
        required: true,
        presentable: false,
        unique: false,
        options: { min: '', max: '' },
      },
    ],
    indexes: [
      'CREATE INDEX `idx_seoptimer_leads_user` ON `seoptimer_leads` (`user`)',
      'CREATE INDEX `idx_seoptimer_leads_crm` ON `seoptimer_leads` (`crm_client`)',
    ],
    listRule: 'user = @request.auth.id',
    viewRule: 'user = @request.auth.id',
    createRule: '',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
    options: {},
  })

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  try {
    const col = dao.findCollectionByNameOrId('seoptimer_leads')
    dao.deleteCollection(col)
  } catch (_) {
    // missing
  }
  const users = dao.findCollectionByNameOrId('_pb_users_auth_')
  try {
    users.schema.removeField('sotmwhky1')
  } catch (_) {
    // missing
  }
  return dao.saveCollection(users)
})
