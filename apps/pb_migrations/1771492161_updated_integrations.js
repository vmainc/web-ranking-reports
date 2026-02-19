/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("6n6dfsp73t4e8jj")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "k9q6a26u",
    "name": "provider",
    "type": "select",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "google_analytics",
        "google_search_console",
        "lighthouse",
        "google_business_profile",
        "google_ads",
        "woocommerce",
        "bing_webmaster"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("6n6dfsp73t4e8jj")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "k9q6a26u",
    "name": "provider",
    "type": "select",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "google_analytics",
        "google_search_console",
        "lighthouse",
        "google_business_profile",
        "google_ads",
        "woocommerce"
      ]
    }
  }))

  return dao.saveCollection(collection)
})
