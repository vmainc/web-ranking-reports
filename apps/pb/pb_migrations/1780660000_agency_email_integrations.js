/// <reference path="../pb_data/types.d.ts" />
/**
 * Agency email integrations (Gmail OAuth) + audit events.
 * Locked rules: server admin SDK only. Also: node apps/web/scripts/add-agency-email-integrations.mjs
 */
migrate((db) => {
  const dao = new Dao(db)

  let users
  try {
    users = dao.findCollectionByNameOrId('users')
  } catch (e) {
    users = dao.findCollectionByNameOrId('_pb_users_auth_')
  }

  try {
    dao.findCollectionByNameOrId('agency_email_integrations')
  } catch (e) {
    const integ = new Collection({
      id: 'aemailint01wrr01',
      created: '2026-08-05 12:00:00.000Z',
      updated: '2026-08-05 12:00:00.000Z',
      name: 'agency_email_integrations',
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
          id: 'aeiagency01',
          name: 'agency',
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
          id: 'aeiprovider',
          name: 'provider',
          type: 'select',
          required: true,
          presentable: false,
          unique: false,
          options: { maxSelect: 1, values: ['system', 'google'] },
        },
        {
          system: false,
          id: 'aeideliverm',
          name: 'delivery_method',
          type: 'select',
          required: true,
          presentable: false,
          unique: false,
          options: { maxSelect: 1, values: ['system', 'google'] },
        },
        {
          system: false,
          id: 'aeisenderem',
          name: 'sender_email',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 320, pattern: '' },
        },
        {
          system: false,
          id: 'aeisendernm',
          name: 'sender_name',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 120, pattern: '' },
        },
        {
          system: false,
          id: 'aeireplyto1',
          name: 'reply_to_email',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 320, pattern: '' },
        },
        {
          system: false,
          id: 'aeisubjtpl1',
          name: 'default_subject_template',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 500, pattern: '' },
        },
        {
          system: false,
          id: 'aeimsgtpl01',
          name: 'default_message_template',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 5000, pattern: '' },
        },
        {
          system: false,
          id: 'aeiencacc01',
          name: 'encrypted_access_token',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 8000, pattern: '' },
        },
        {
          system: false,
          id: 'aeiencref01',
          name: 'encrypted_refresh_token',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 8000, pattern: '' },
        },
        {
          system: false,
          id: 'aeitokexp01',
          name: 'token_expiry',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 40, pattern: '' },
        },
        {
          system: false,
          id: 'aeiscopes01',
          name: 'scopes',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 2000, pattern: '' },
        },
        {
          system: false,
          id: 'aeigoogid01',
          name: 'google_account_id',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 128, pattern: '' },
        },
        {
          system: false,
          id: 'aeiconnst01',
          name: 'connection_status',
          type: 'select',
          required: true,
          presentable: false,
          unique: false,
          options: {
            maxSelect: 1,
            values: ['disconnected', 'connected', 'reconnect_required', 'error'],
          },
        },
        {
          system: false,
          id: 'aeilastcon',
          name: 'last_connected_at',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 40, pattern: '' },
        },
        {
          system: false,
          id: 'aeilastref',
          name: 'last_token_refresh_at',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 40, pattern: '' },
        },
        {
          system: false,
          id: 'aeilastok1',
          name: 'last_successful_send_at',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 40, pattern: '' },
        },
        {
          system: false,
          id: 'aeilasterr',
          name: 'last_send_error',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 500, pattern: '' },
        },
        {
          system: false,
          id: 'aeilasttst',
          name: 'last_test_at',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 40, pattern: '' },
        },
        {
          system: false,
          id: 'aeitststat',
          name: 'last_test_status',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 40, pattern: '' },
        },
        {
          system: false,
          id: 'aeicreated',
          name: 'created_by',
          type: 'relation',
          required: false,
          presentable: false,
          unique: false,
          options: {
            collectionId: users.id,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null,
          },
        },
        {
          system: false,
          id: 'aeiupdated',
          name: 'updated_by',
          type: 'relation',
          required: false,
          presentable: false,
          unique: false,
          options: {
            collectionId: users.id,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null,
          },
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_agency_email_integrations_agency ON agency_email_integrations (agency)',
      ],
    })
    dao.saveCollection(integ)
  }

  try {
    dao.findCollectionByNameOrId('agency_email_audit_events')
  } catch (e) {
    const audit = new Collection({
      id: 'aemailaud01wrr01',
      created: '2026-08-05 12:00:00.000Z',
      updated: '2026-08-05 12:00:00.000Z',
      name: 'agency_email_audit_events',
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
          id: 'aeaagency01',
          name: 'agency',
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
          id: 'aeaactor001',
          name: 'actor',
          type: 'relation',
          required: false,
          presentable: false,
          unique: false,
          options: {
            collectionId: users.id,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null,
          },
        },
        {
          system: false,
          id: 'aeaeventtyp',
          name: 'event_type',
          type: 'select',
          required: true,
          presentable: false,
          unique: false,
          options: {
            maxSelect: 1,
            values: [
              'google_connected',
              'google_reconnected',
              'google_disconnected',
              'delivery_method_changed',
              'test_email_sent',
              'test_email_failed',
            ],
          },
        },
        {
          system: false,
          id: 'aeametajson',
          name: 'metadata_json',
          type: 'json',
          required: false,
          presentable: false,
          unique: false,
          options: {},
        },
      ],
      indexes: ['CREATE INDEX idx_agency_email_audit_agency ON agency_email_audit_events (agency)'],
    })
    dao.saveCollection(audit)
  }
}, (db) => {
  const dao = new Dao(db)
  try {
    dao.deleteCollection(dao.findCollectionByNameOrId('agency_email_audit_events'))
  } catch (e) {}
  try {
    dao.deleteCollection(dao.findCollectionByNameOrId('agency_email_integrations'))
  } catch (e) {}
})
