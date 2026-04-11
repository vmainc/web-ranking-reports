/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("44tmwrwuophbsqk")
  const schema = collection.schema
  const has = (name) => !!schema.getFieldByName(name)

  // add (skip if already present — DB may have been updated outside this migration file)
  if (has("mailing_address_line1")) {
    return dao.saveCollection(collection)
  }

  // add
  schema.addField(new SchemaField({
    "system": false,
    "id": "zo2yjluz",
    "name": "mailing_address_line1",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": 255,
      "pattern": ""
    }
  }))

  // add
  schema.addField(new SchemaField({
    "system": false,
    "id": "snrqzhvw",
    "name": "mailing_address_line2",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": 255,
      "pattern": ""
    }
  }))

  // add
  schema.addField(new SchemaField({
    "system": false,
    "id": "9ws8fig1",
    "name": "mailing_city",
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
  schema.addField(new SchemaField({
    "system": false,
    "id": "0fi78ugg",
    "name": "mailing_state",
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
  schema.addField(new SchemaField({
    "system": false,
    "id": "wh0wunac",
    "name": "mailing_postal_code",
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
  schema.addField(new SchemaField({
    "system": false,
    "id": "qyc2ywrn",
    "name": "mailing_country",
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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("44tmwrwuophbsqk")

  // remove
  collection.schema.removeField("zo2yjluz")

  // remove
  collection.schema.removeField("snrqzhvw")

  // remove
  collection.schema.removeField("9ws8fig1")

  // remove
  collection.schema.removeField("0fi78ugg")

  // remove
  collection.schema.removeField("wh0wunac")

  // remove
  collection.schema.removeField("qyc2ywrn")

  return dao.saveCollection(collection)
})
