/// <reference path="../pb_data/types.d.ts" />
/**
 * Embeddable website audit form (SEOptimer replacement).
 * Public submissions go through Nuxt admin SDK; collection rules deny client JWT create.
 */
migrate((db) => {
  const dao = new Dao(db)

  try {
    dao.findCollectionByNameOrId('website_audit_leads')
    return
  } catch (_) {
    // create
  }

  let users
  try {
    users = dao.findCollectionByNameOrId('users')
  } catch (e) {
    users = dao.findCollectionByNameOrId('_pb_users_auth_')
  }

  let crmClientsId
  try {
    crmClientsId = dao.findCollectionByNameOrId('crm_clients').id
  } catch (_) {
    throw new Error(
      'website_audit_leads migration: collection "crm_clients" not found — create CRM collections first.',
    )
  }

  const collection = new Collection({
    id: 'wbsiteauditlead1',
    created: '2026-10-16 12:00:00.000Z',
    updated: '2026-10-16 12:00:00.000Z',
    name: 'website_audit_leads',
    type: 'base',
    system: false,
    listRule: 'user = @request.auth.id',
    viewRule: 'user = @request.auth.id',
    createRule: '',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
    schema: [
      {
        system: false,
        id: 'waluser00001',
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
        id: 'walname00001',
        name: 'name',
        type: 'text',
        required: false,
        presentable: true,
        unique: false,
        options: { min: null, max: 500, pattern: '' },
      },
      {
        system: false,
        id: 'walemail0001',
        name: 'email',
        type: 'text',
        required: true,
        presentable: true,
        unique: false,
        options: { min: null, max: 500, pattern: '' },
      },
      {
        system: false,
        id: 'walphone0001',
        name: 'phone',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 120, pattern: '' },
      },
      {
        system: false,
        id: 'walwebsit01',
        name: 'website',
        type: 'text',
        required: true,
        presentable: true,
        unique: false,
        options: { min: null, max: 2000, pattern: '' },
      },
      {
        system: false,
        id: 'walstatus01',
        name: 'status',
        type: 'select',
        required: true,
        presentable: true,
        unique: false,
        options: {
          maxSelect: 1,
          values: ['received', 'processing', 'ready', 'error'],
        },
      },
      {
        system: false,
        id: 'walpubtok01',
        name: 'public_token',
        type: 'text',
        required: true,
        presentable: false,
        unique: true,
        options: { min: null, max: 80, pattern: '' },
      },
      {
        system: false,
        id: 'walauditj01',
        name: 'audit_json',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: { maxSize: 2000000 },
      },
      {
        system: false,
        id: 'walcrmcli01',
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
        id: 'walerrtxt01',
        name: 'error_text',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 10000, pattern: '' },
      },
      {
        system: false,
        id: 'walrecvdt01',
        name: 'received_at',
        type: 'date',
        required: true,
        presentable: false,
        unique: false,
        options: {},
      },
      {
        system: false,
        id: 'walemsent01',
        name: 'email_sent_at',
        type: 'date',
        required: false,
        presentable: false,
        unique: false,
        options: {},
      },
      {
        system: false,
        id: 'walpayload1',
        name: 'payload_json',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: { maxSize: 200000 },
      },
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_website_audit_leads_token` ON `website_audit_leads` (`public_token`)',
      'CREATE INDEX `idx_website_audit_leads_user` ON `website_audit_leads` (`user`)',
      'CREATE INDEX `idx_website_audit_leads_crm` ON `website_audit_leads` (`crm_client`)',
      'CREATE INDEX `idx_website_audit_leads_status` ON `website_audit_leads` (`status`)',
    ],
  })

  dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  try {
    const col = dao.findCollectionByNameOrId('website_audit_leads')
    dao.deleteCollection(col)
  } catch (_) {}
})
