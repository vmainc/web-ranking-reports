/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "h41l6unro9wce47",
    "created": "2026-02-12 11:31:25.856Z",
    "updated": "2026-02-12 11:31:25.856Z",
    "name": "reports",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "gnrdwlmq",
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
        "id": "ycjxilld",
        "name": "type",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": 64,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "vbc3x2zf",
        "name": "period_start",
        "type": "date",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "9a9ycung",
        "name": "period_end",
        "type": "date",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "14xniidh",
        "name": "payload_json",
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
      "CREATE INDEX `idx_reports_site` ON `reports` (`site`)"
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
  const collection = dao.findCollectionByNameOrId("h41l6unro9wce47");

  return dao.deleteCollection(collection);
})
