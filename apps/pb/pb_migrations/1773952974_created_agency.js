/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "rojcy8pfkulbezy",
    "created": "2026-03-19 20:42:54.740Z",
    "updated": "2026-03-19 20:42:54.740Z",
    "name": "agency",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "clgo9izb",
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
  const collection = dao.findCollectionByNameOrId("rojcy8pfkulbezy");

  return dao.deleteCollection(collection);
})
