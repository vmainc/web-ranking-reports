/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("crm_contact_points")
  const field = collection.schema.getFieldByName("kind")
  if (!field?.options?.values || !Array.isArray(field.options.values)) {
    return dao.saveCollection(collection)
  }
  if (!field.options.values.includes("report_sent")) {
    field.options.values.push("report_sent")
  }
  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("crm_contact_points")
  const field = collection.schema.getFieldByName("kind")
  if (field?.options?.values && Array.isArray(field.options.values)) {
    field.options.values = field.options.values.filter((v) => v !== "report_sent")
  }
  return dao.saveCollection(collection)
})
