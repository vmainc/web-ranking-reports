/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("sites")
  const schema = collection.schema
  if (schema.getFieldByName("lifecycle")) {
    return dao.saveCollection(collection)
  }
  schema.addField(new SchemaField({
    "system": false,
    "id": "sitelifec1",
    "name": "lifecycle",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": ["prospect", "active"]
    }
  }))
  schema.addField(new SchemaField({
    "system": false,
    "id": "sitepromot1",
    "name": "promoted_at",
    "type": "date",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": "",
      "max": ""
    }
  }))
  schema.addField(new SchemaField({
    "system": false,
    "id": "sitepromot2",
    "name": "promoted_from_proposal",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": 32,
      "pattern": ""
    }
  }))
  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("sites")
  const schema = collection.schema
  const lifecycle = schema.getFieldByName("lifecycle")
  if (lifecycle) schema.removeField(lifecycle.id)
  const promotedAt = schema.getFieldByName("promoted_at")
  if (promotedAt) schema.removeField(promotedAt.id)
  const promotedFrom = schema.getFieldByName("promoted_from_proposal")
  if (promotedFrom) schema.removeField(promotedFrom.id)
  return dao.saveCollection(collection)
})
