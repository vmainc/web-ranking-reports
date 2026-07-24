/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  try {
    dao.findCollectionByNameOrId("proposal_products")
    return
  } catch (e) {}

  const sites = dao.findCollectionByNameOrId("sites")

  const collection = new Collection({
    "id": "p8r0prd5c4t9l0g",
    "created": "2026-07-24 14:00:00.000Z",
    "updated": "2026-07-24 14:00:00.000Z",
    "name": "proposal_products",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "pp0user001",
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
        "id": "pp0catsite",
        "name": "catalog_site",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": sites.id,
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "pp0extid01",
        "name": "external_id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": 64,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "pp0sku0001",
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
        "id": "pp0name001",
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
        "id": "pp0desc001",
        "name": "description",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 10000,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "pp0price01",
        "name": "price",
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
        "id": "pp0regprc1",
        "name": "regular_price",
        "type": "number",
        "required": false,
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
        "id": "pp0salepr1",
        "name": "sale_price",
        "type": "number",
        "required": false,
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
        "id": "pp0currenc",
        "name": "currency",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 8,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "pp0status1",
        "name": "status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": ["publish", "draft", "archived"]
        }
      },
      {
        "system": false,
        "id": "pp0woosts1",
        "name": "woo_status",
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
        "id": "pp0imgurl1",
        "name": "image_url",
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
        "id": "pp0permal1",
        "name": "permalink",
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
        "id": "pp0rawjson",
        "name": "raw_json",
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
        "id": "pp0synced1",
        "name": "synced_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_proposal_products_user` ON `proposal_products` (`user`)",
      "CREATE INDEX `idx_proposal_products_catalog` ON `proposal_products` (`catalog_site`)",
      "CREATE UNIQUE INDEX `idx_proposal_products_unique` ON `proposal_products` (`user`, `catalog_site`, `external_id`)"
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
    const collection = dao.findCollectionByNameOrId("proposal_products");
    return dao.deleteCollection(collection);
  } catch (e) {}
})
