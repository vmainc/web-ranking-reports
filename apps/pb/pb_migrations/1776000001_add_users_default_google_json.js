/// <reference path="../pb_data/types.d.ts" />
/**
 * Stores workspace-level Google OAuth tokens + dashboard calendar selection on the auth user.
 * Shape (app-managed JSON): { google: { access_token, refresh_token?, scope, ... }, dashboard_calendars?: [{id, summary}] }
 */
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")
  if (collection.schema.getFieldByName("default_google_json")) {
    return
  }
  collection.schema.addField(
    new SchemaField({
      system: false,
      id: "wrrdgjs1",
      name: "default_google_json",
      type: "json",
      required: false,
      presentable: false,
      unique: false,
      options: {},
    }),
  )
  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")
  try {
    collection.schema.removeField("wrrdgjs1")
  } catch (_) {
    // field missing
  }
  return dao.saveCollection(collection)
})
