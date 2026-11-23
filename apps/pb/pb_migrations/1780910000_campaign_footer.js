/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  try {
    const col = dao.findCollectionByNameOrId('agency_email_integrations')
    if (!col.schema.getFieldByName('campaign_footer_html')) {
      col.schema.addField(
        new SchemaField({
          system: false,
          id: 'aeicampfoot',
          name: 'campaign_footer_html',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: 3000, pattern: '' },
        }),
      )
      dao.saveCollection(col)
    }
  } catch (e) {
    console.log('[migration] campaign_footer_html:', e)
  }
}, (db) => {
  const dao = new Dao(db)
  try {
    const col = dao.findCollectionByNameOrId('agency_email_integrations')
    const f = col.schema.getFieldByName('campaign_footer_html')
    if (f) {
      col.schema.removeField(f.id)
      dao.saveCollection(col)
    }
  } catch (_) {}
})