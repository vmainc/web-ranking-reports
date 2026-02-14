/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "nqcje2t181vaqqj",
    "created": "2026-02-14 15:29:48.710Z",
    "updated": "2026-02-14 15:29:48.710Z",
    "name": "site_dashboard_settings",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "hgmtucn1",
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
        "id": "ynvzh5cd",
        "name": "layout_json",
        "type": "json",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 500000
        }
      },
      {
        "system": false,
        "id": "2nhkpqth",
        "name": "updated_at",
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
      "CREATE UNIQUE INDEX `idx_site_dashboard_settings_site` ON `site_dashboard_settings` (`site`)"
    ],
    "listRule": "@request.auth.id != \"\" && site.user = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && site.user = @request.auth.id",
    "createRule": "@request.auth.id != \"\" && site.user = @request.auth.id",
    "updateRule": "site.user = @request.auth.id",
    "deleteRule": "site.user = @request.auth.id",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("nqcje2t181vaqqj");

  return dao.deleteCollection(collection);
})
