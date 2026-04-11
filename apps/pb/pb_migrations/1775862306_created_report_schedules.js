/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "sqabt5n9f6re26s",
    "created": "2026-04-10 23:05:06.270Z",
    "updated": "2026-04-10 23:05:06.270Z",
    "name": "report_schedules",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "mwgp7k7s",
        "name": "site",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "ywrqnt8u0cy0z85",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": [
            "name",
            "domain"
          ]
        }
      },
      {
        "system": false,
        "id": "uwwq9bk9",
        "name": "frequency",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "daily",
            "weekly",
            "monthly"
          ]
        }
      },
      {
        "system": false,
        "id": "p82av7sy",
        "name": "start_at",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 4,
          "max": 40,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "djwjeek7",
        "name": "last_run_at",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": 40,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "8rpjus8l",
        "name": "next_run_at",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 4,
          "max": 40,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "al7stji6",
        "name": "is_active",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "kisyitk2",
        "name": "created_by",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": [
            "email",
            "name"
          ]
        }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_report_schedules_site` ON `report_schedules` (`site`)",
      "CREATE INDEX `idx_report_schedules_next` ON `report_schedules` (`next_run_at`)"
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
  const collection = dao.findCollectionByNameOrId("sqabt5n9f6re26s");

  return dao.deleteCollection(collection);
})
