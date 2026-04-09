/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "v740f9z4lihxzt3",
    "created": "2026-04-08 18:00:56.444Z",
    "updated": "2026-04-08 18:00:56.444Z",
    "name": "agency",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "la8waynx",
        "name": "logo",
        "type": "file",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "mimeTypes": null,
          "thumbs": null,
          "maxSelect": 1,
          "maxSize": 2097152,
          "protected": false
        }
      }
    ],
    "indexes": [],
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
  const collection = dao.findCollectionByNameOrId("v740f9z4lihxzt3");

  return dao.deleteCollection(collection);
})
