/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("crm_contact_points")
  const field = collection.schema.getFieldByName("kind")
  if (!field?.options?.values || !Array.isArray(field.options.values)) {
    return dao.saveCollection(collection)
  }
  const extras = [
    "proposal_created",
    "proposal_sent",
    "proposal_viewed",
    "proposal_accepted",
    "proposal_declined",
    "proposal_superseded",
  ]
  for (const v of extras) {
    if (!field.options.values.includes(v)) field.options.values.push(v)
  }
  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("crm_contact_points")
  const field = collection.schema.getFieldByName("kind")
  if (field?.options?.values && Array.isArray(field.options.values)) {
    field.options.values = field.options.values.filter((v) => !String(v).startsWith("proposal_"))
  }
  return dao.saveCollection(collection)
})
