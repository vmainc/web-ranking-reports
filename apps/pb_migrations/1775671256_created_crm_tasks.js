/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "5i97mcnl7u8ys6q",
    "created": "2026-04-08 18:00:56.446Z",
    "updated": "2026-04-08 18:00:56.446Z",
    "name": "crm_tasks",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "k9ymlrky",
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
        "id": "edaluchw",
        "name": "client",
        "type": "relation",
        "required": false,
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
        "id": "jajfhxgy",
        "name": "title",
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
        "id": "jombax7j",
        "name": "due_at",
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
        "id": "brvabtqd",
        "name": "priority",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "low",
            "med",
            "high"
          ]
        }
      },
      {
        "system": false,
        "id": "2fw183qh",
        "name": "status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "open",
            "done"
          ]
        }
      },
      {
        "system": false,
        "id": "iydwp7vk",
        "name": "notes",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 5000,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "e1bkz2wn",
        "name": "site",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "7l6kyk575n78m9c",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      }
    ],
    "indexes": [],
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
  const collection = dao.findCollectionByNameOrId("5i97mcnl7u8ys6q");

  return dao.deleteCollection(collection);
})
