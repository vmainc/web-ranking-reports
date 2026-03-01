/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "t32dlgt2h3b2t65",
    "created": "2026-03-01 14:48:47.992Z",
    "updated": "2026-03-01 14:48:47.992Z",
    "name": "lead_submissions",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "1uihw9dy",
        "name": "form",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "rdeb8zftet6xs7s",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "zppyx3el",
        "name": "submitted_at",
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
        "id": "ch5hawcb",
        "name": "lead_name",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 500,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "slhwxoxf",
        "name": "lead_email",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 500,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "jnepukuj",
        "name": "lead_phone",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 100,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "tiam72dw",
        "name": "lead_website",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 2000,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "bb0undkh",
        "name": "payload_json",
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
        "id": "82rfe7hl",
        "name": "status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "new",
            "processing",
            "ready",
            "error",
            "archived"
          ]
        }
      },
      {
        "system": false,
        "id": "ggvsvrb1",
        "name": "audit_json",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 2000000
        }
      },
      {
        "system": false,
        "id": "l6ybb4rm",
        "name": "error_text",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 10000,
          "pattern": ""
        }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_lead_submissions_form` ON `lead_submissions` (`form`)",
      "CREATE INDEX `idx_lead_submissions_status` ON `lead_submissions` (`status`)"
    ],
    "listRule": "@request.auth.id != \"\" && form.site.user = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && form.site.user = @request.auth.id",
    "createRule": "",
    "updateRule": "form.site.user = @request.auth.id",
    "deleteRule": "form.site.user = @request.auth.id",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("t32dlgt2h3b2t65");

  return dao.deleteCollection(collection);
})
