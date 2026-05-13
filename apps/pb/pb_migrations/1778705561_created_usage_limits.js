/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "i0ede4vso7uc143",
    "created": "2026-05-13 20:52:41.416Z",
    "updated": "2026-05-13 20:52:41.416Z",
    "name": "usage_limits",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "vh3qba0e",
        "name": "plan",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": 32,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "xhcmmynb",
        "name": "max_sites",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "8ss2lnes",
        "name": "max_keywords",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "72zqp89n",
        "name": "max_contacts",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "oowwwigu",
        "name": "max_reports_per_month",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "jxy18fhh",
        "name": "white_label",
        "type": "bool",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "zer9btvm",
        "name": "branding_required",
        "type": "bool",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_usage_limits_plan` ON `usage_limits` (`plan`)"
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
  const collection = dao.findCollectionByNameOrId("i0ede4vso7uc143");

  return dao.deleteCollection(collection);
})
