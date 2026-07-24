/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const items = dao.findCollectionByNameOrId("proposal_items")
  const schema = items.schema
  if (schema.getFieldByName("product")) {
    return dao.saveCollection(items)
  }
  let productsId = ""
  try {
    productsId = dao.findCollectionByNameOrId("proposal_products").id
  } catch (e) {
    return dao.saveCollection(items)
  }
  schema.addField(new SchemaField({
    "system": false,
    "id": "pi0product",
    "name": "product",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": productsId,
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))
  return dao.saveCollection(items)
}, (db) => {
  const dao = new Dao(db)
  const items = dao.findCollectionByNameOrId("proposal_items")
  const field = items.schema.getFieldByName("product")
  if (field) items.schema.removeField(field.id)
  return dao.saveCollection(items)
})
