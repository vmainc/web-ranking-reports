/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "7v4i5j73xlt9y0b",
    "created": "2026-04-08 18:00:56.445Z",
    "updated": "2026-04-08 18:00:56.445Z",
    "name": "crm_contact_points",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "fh4rjxjv",
        "name": "user",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "lyxgsads",
        "name": "client",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "44tmwrwuophbsqk",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
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
      },
      {
        "system": false,
        "id": "u26gk0co",
        "name": "happened_at",
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
        "id": "2wx17txr",
        "name": "summary",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 5000,
          "pattern": ""
        }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_crm_contact_points_user` ON `crm_contact_points` (`user`)",
      "CREATE INDEX `idx_crm_contact_points_client` ON `crm_contact_points` (`client`)"
    ],
    "listRule": "user = @request.auth.id",
    "viewRule": "user = @request.auth.id",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "user = @request.auth.id",
    "deleteRule": "user = @request.auth.id",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("7v4i5j73xlt9y0b");

  return dao.deleteCollection(collection);
})
