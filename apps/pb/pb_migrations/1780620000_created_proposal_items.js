/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  try {
    dao.findCollectionByNameOrId("proposal_items")
    return
  } catch (e) {}

  const proposals = dao.findCollectionByNameOrId("proposals")

  const collection = new Collection({
    "id": "p8r0i1t3m5x7k9w",
    "created": "2026-07-23 15:01:00.000Z",
    "updated": "2026-07-23 15:01:00.000Z",
    "name": "proposal_items",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "pi0user001",
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
        "id": "pi0propos01",
        "name": "proposal",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": proposals.id,
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "pi0sort001",
        "name": "sort_order",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": true
        }
      },
      {
        "system": false,
        "id": "pi0source1",
        "name": "source",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": ["woo", "manual", "package"]
        }
      },
      {
        "system": false,
        "id": "pi0extid01",
        "name": "external_product_id",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 64,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "pi0sku0001",
        "name": "sku",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 128,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "pi0name001",
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
        "id": "pi0desc001",
        "name": "description",
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
        "id": "pi0qty0001",
        "name": "qty",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "pi0uprice1",
        "name": "unit_price",
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
        "id": "pi0billint",
        "name": "billing_interval",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": ["one_time", "month", "year", "custom"]
        }
      },
      {
        "system": false,
        "id": "pi0meta001",
        "name": "metadata_json",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 200000
        }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_proposal_items_user` ON `proposal_items` (`user`)",
      "CREATE INDEX `idx_proposal_items_proposal` ON `proposal_items` (`proposal`)"
    ],
    "listRule": "user = @request.auth.id",
    "viewRule": "user = @request.auth.id",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "user = @request.auth.id",
    "deleteRule": "user = @request.auth.id",
    "options": {}
  });

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  try {
    const collection = dao.findCollectionByNameOrId("proposal_items");
    return dao.deleteCollection(collection);
  } catch (e) {}
})
