/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7v4i5j73xlt9y0b")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yx1igrvt",
    "name": "kind",
    "type": "select",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "call",
        "email",
        "meeting",
        "note",
        "report_sent"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7v4i5j73xlt9y0b")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yx1igrvt",
    "name": "kind",
    "type": "select",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "call",
        "email",
        "meeting",
        "note"
      ]
    }
  }))

  return dao.saveCollection(collection)
})
