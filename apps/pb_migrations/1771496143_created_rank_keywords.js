/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "tzd4a71pm28eq6x",
    "created": "2026-02-19 10:15:43.164Z",
    "updated": "2026-02-19 10:15:43.164Z",
    "name": "rank_keywords",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "d5c9aw4x",
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
        "id": "6n1ogcw7",
        "name": "keyword",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": 700,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "1tl1zmjk",
        "name": "last_result_json",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 100000
        }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_rank_keywords_site` ON `rank_keywords` (`site`)"
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
  const collection = dao.findCollectionByNameOrId("tzd4a71pm28eq6x");

  return dao.deleteCollection(collection);
})
