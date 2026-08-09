/// <reference path="../pb_data/types.d.ts" />
/**
 * Add rank_tracking_config to sites and ranking-identity fields to history collections.
 * Backward compatible: missing config → US/en/desktop defaults in application code.
 */
migrate((db) => {
  const dao = new Dao(db)

  // sites.rank_tracking_config (json)
  try {
    const sites = dao.findCollectionByNameOrId("sites")
    if (!sites.schema.getFieldByName("rank_tracking_config")) {
      sites.schema.addField(new SchemaField({
        "system": false,
        "id": "siterankcfg1",
        "name": "rank_tracking_config",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": { "maxSize": 200000 }
      }))
      dao.saveCollection(sites)
    }
  } catch (e) {
    console.log("[migration] sites.rank_tracking_config:", e)
  }

  const identityFields = [
    { idSuffix: "locc", name: "location_code", type: "number", options: { min: 0, max: null, noDecimal: true } },
    { idSuffix: "locn", name: "location_name", type: "text", options: { min: null, max: 255, pattern: "" } },
    { idSuffix: "lang", name: "language_code", type: "text", options: { min: null, max: 16, pattern: "" } },
    { idSuffix: "dev", name: "device", type: "text", options: { min: null, max: 32, pattern: "" } },
    { idSuffix: "os", name: "os", type: "text", options: { min: null, max: 32, pattern: "" } },
    { idSuffix: "se", name: "search_engine", type: "text", options: { min: null, max: 32, pattern: "" } },
  ]

  function addIdentityFields(collectionName, idPrefix) {
    try {
      const col = dao.findCollectionByNameOrId(collectionName)
      let changed = false
      for (const f of identityFields) {
        if (col.schema.getFieldByName(f.name)) continue
        col.schema.addField(new SchemaField({
          "system": false,
          "id": (idPrefix + f.idSuffix).slice(0, 16),
          "name": f.name,
          "type": f.type,
          "required": false,
          "presentable": false,
          "unique": false,
          "options": f.options,
        }))
        changed = true
      }
      if (changed) dao.saveCollection(col)
    } catch (e) {
      console.log("[migration] " + collectionName + " identity fields:", e)
    }
  }

  addIdentityFields("rank_keyword_snapshots", "rksid")
  addIdentityFields("keyword_rankings", "krid")
}, (db) => {
  const dao = new Dao(db)
  try {
    const sites = dao.findCollectionByNameOrId("sites")
    const f = sites.schema.getFieldByName("rank_tracking_config")
    if (f) {
      sites.schema.removeField(f.id)
      dao.saveCollection(sites)
    }
  } catch (_) {}

  function removeIdentityFields(collectionName) {
    try {
      const col = dao.findCollectionByNameOrId(collectionName)
      for (const name of ["location_code", "location_name", "language_code", "device", "os", "search_engine"]) {
        const f = col.schema.getFieldByName(name)
        if (f) col.schema.removeField(f.id)
      }
      dao.saveCollection(col)
    } catch (_) {}
  }
  removeIdentityFields("rank_keyword_snapshots")
  removeIdentityFields("keyword_rankings")
})
