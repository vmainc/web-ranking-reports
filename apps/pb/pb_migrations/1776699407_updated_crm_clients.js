/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("44tmwrwuophbsqk")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rmqqfv3r",
    "name": "name_prefix",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": 30,
      "pattern": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "foiiimdt",
    "name": "first_name",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": 120,
      "pattern": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ugw8eah9",
    "name": "last_name",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": 120,
      "pattern": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "s6obzpxy",
    "name": "business_phone",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": 100,
      "pattern": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "onyfixko",
    "name": "cell_phone",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": 100,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("44tmwrwuophbsqk")

  // remove
  collection.schema.removeField("rmqqfv3r")

  // remove
  collection.schema.removeField("foiiimdt")

  // remove
  collection.schema.removeField("ugw8eah9")

  // remove
  collection.schema.removeField("s6obzpxy")

  // remove
  collection.schema.removeField("onyfixko")

  return dao.saveCollection(collection)
})
