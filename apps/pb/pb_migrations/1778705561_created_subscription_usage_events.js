/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "penfiw36scm16os",
    "created": "2026-05-13 20:52:41.431Z",
    "updated": "2026-05-13 20:52:41.431Z",
    "name": "subscription_usage_events",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "9spqccj2",
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
        "id": "wie2ylav",
        "name": "type",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": 32,
          "pattern": ""
        }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_sub_usage_user_type` ON `subscription_usage_events` (\n  `user`,\n  `type`\n)",
      "CREATE INDEX `idx_sub_usage_created` ON `subscription_usage_events` (`created`)"
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("penfiw36scm16os");

  return dao.deleteCollection(collection);
})
