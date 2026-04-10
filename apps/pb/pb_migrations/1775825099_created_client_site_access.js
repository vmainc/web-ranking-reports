/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "iknr1299khu277k",
    "created": "2026-04-10 12:44:59.974Z",
    "updated": "2026-04-10 12:44:59.974Z",
    "name": "client_site_access",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "ec4jkegt",
        "name": "owner",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "pszb1v1q",
        "name": "client",
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
        "id": "5vyomg6b",
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
          "displayFields": null
        }
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_client_site_access_unique` ON `client_site_access` (\n  `client`,\n  `site`\n)"
    ],
    "listRule": "@request.auth.id != \"\" && (client = @request.auth.id || owner = @request.auth.id || site.user = @request.auth.id)",
    "viewRule": "@request.auth.id != \"\" && (client = @request.auth.id || owner = @request.auth.id || site.user = @request.auth.id)",
    "createRule": "@request.auth.id != \"\" && owner = @request.auth.id",
    "updateRule": "owner = @request.auth.id",
    "deleteRule": "owner = @request.auth.id",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("iknr1299khu277k");

  return dao.deleteCollection(collection);
})
