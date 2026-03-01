/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "rdeb8zftet6xs7s",
    "created": "2026-03-01 14:48:47.979Z",
    "updated": "2026-03-01 14:48:47.979Z",
    "name": "lead_forms",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "a4fqck82",
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
        "id": "dchkotcn",
        "name": "name",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": 255,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "ubiapmlg",
        "name": "status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "draft",
            "published"
          ]
        }
      },
      {
        "system": false,
        "id": "6v1rpgoi",
        "name": "fields_json",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 500000
        }
      },
      {
        "system": false,
        "id": "chjfdxjj",
        "name": "conditional_json",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 100000
        }
      },
      {
        "system": false,
        "id": "mi7dg3qu",
        "name": "settings_json",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 50000
        }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_lead_forms_site` ON `lead_forms` (`site`)"
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
  const collection = dao.findCollectionByNameOrId("rdeb8zftet6xs7s");

  return dao.deleteCollection(collection);
})
