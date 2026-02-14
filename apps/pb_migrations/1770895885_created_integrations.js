/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "6n6dfsp73t4e8jj",
    "created": "2026-02-12 11:31:25.849Z",
    "updated": "2026-02-12 11:31:25.849Z",
    "name": "integrations",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "0hzhea0j",
        "name": "site",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "7l6kyk575n78m9c",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
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
      },
      {
        "system": false,
        "id": "fgixrlua",
        "name": "status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "disconnected",
            "pending",
            "connected",
            "error"
          ]
        }
      },
      {
        "system": false,
        "id": "xo2c1uzy",
        "name": "connected_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "wjqn1edk",
        "name": "config_json",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 2000000
        }
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_integrations_site_provider` ON `integrations` (\n  `site`,\n  `provider`\n)"
    ],
    "listRule": "@request.auth.id != \"\" && site.user = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && site.user = @request.auth.id",
    "createRule": "@request.auth.id != \"\" && site.user = @request.auth.id",
    "updateRule": "site.user = @request.auth.id",
    "deleteRule": "site.user = @request.auth.id",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("6n6dfsp73t4e8jj");

  return dao.deleteCollection(collection);
})
