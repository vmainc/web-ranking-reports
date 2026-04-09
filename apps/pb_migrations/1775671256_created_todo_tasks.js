/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "3v8o3o4hytx7e8k",
    "created": "2026-04-08 18:00:56.448Z",
    "updated": "2026-04-08 18:00:56.448Z",
    "name": "todo_tasks",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "m4z1vkyy",
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
        "id": "irxyx9wz",
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
        "id": "ukydusa1",
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
        "id": "zeujkize",
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
        "id": "a64r2hdg",
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
        "id": "puhr2x6z",
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
        "id": "hmifjcgk",
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
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_todo_tasks_user` ON `todo_tasks` (`user`)",
      "CREATE INDEX `idx_todo_tasks_site` ON `todo_tasks` (`site`)"
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
  const collection = dao.findCollectionByNameOrId("3v8o3o4hytx7e8k");

  return dao.deleteCollection(collection);
})
