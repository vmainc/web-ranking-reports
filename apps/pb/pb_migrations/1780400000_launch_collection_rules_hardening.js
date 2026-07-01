/// <reference path="../pb_data/types.d.ts" />
/**
 * v1 launch: idempotently lock admin-only collections and tighten site-scoped rules.
 * Apply: restart PocketBase with pb_migrations mounted (Docker) or `pb migrate` locally.
 */
migrate((db) => {
  const dao = new Dao(db)

  const adminOnly = {
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
  }

  for (const name of [
    'app_settings',
    'subscriptions',
    'usage_limits',
    'subscription_usage_events',
    'agency',
  ]) {
    try {
      const collection = dao.findCollectionByNameOrId(name)
      collection.listRule = adminOnly.listRule
      collection.viewRule = adminOnly.viewRule
      collection.createRule = adminOnly.createRule
      collection.updateRule = adminOnly.updateRule
      collection.deleteRule = adminOnly.deleteRule
      dao.saveCollection(collection)
    } catch (_) {
      // Collection not present on this environment
    }
  }

  // Site owners may manage schedules via user token; cron still uses admin SDK (bypasses rules).
  try {
    const collection = dao.findCollectionByNameOrId('report_schedules')
    const owner = '@request.auth.id != "" && site.user = @request.auth.id'
    collection.listRule = owner
    collection.viewRule = owner
    collection.createRule = owner
    collection.updateRule = owner
    collection.deleteRule = owner
    dao.saveCollection(collection)
  } catch (_) {}

  // Public creates go through Nuxt (admin SDK); block direct anonymous PB API writes.
  try {
    const collection = dao.findCollectionByNameOrId('lead_submissions')
    collection.createRule = ''
    dao.saveCollection(collection)
  } catch (_) {}
}, (db) => {
  // Non-destructive forward-only hardening; no down migration.
})
