/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "hudgso6733etwcz",
    "created": "2026-04-08 18:00:56.446Z",
    "updated": "2026-04-08 18:00:56.446Z",
    "name": "crm_outsourcing",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "fmkokwc1",
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
        "id": "8mom2rjr",
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
        "id": "mwsstg8c",
        "name": "order_date",
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
        "id": "9v6gexcf",
        "name": "service",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": 500,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "zjemsrwi",
        "name": "order_id",
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
        "id": "8ujwe9ba",
        "name": "invoice_id",
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
        "id": "qiwzrdh5",
        "name": "currency",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 10,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "mexqey8q",
        "name": "total",
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
        "id": "40zow9jr",
        "name": "notes",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 2000,
          "pattern": ""
        }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_crm_outsourcing_user` ON `crm_outsourcing` (`user`)",
      "CREATE INDEX `idx_crm_outsourcing_client` ON `crm_outsourcing` (`client`)"
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
  const collection = dao.findCollectionByNameOrId("hudgso6733etwcz");

  return dao.deleteCollection(collection);
})
