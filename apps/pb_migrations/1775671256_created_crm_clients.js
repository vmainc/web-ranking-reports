/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "44tmwrwuophbsqk",
    "created": "2026-04-08 18:00:56.444Z",
    "updated": "2026-04-08 18:00:56.444Z",
    "name": "crm_clients",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "eycaeutb",
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
        "id": "uegres77",
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
        "id": "cppzi3bq",
        "name": "email",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 255,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "ormhromr",
        "name": "phone",
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
        "id": "no9g1oqq",
        "name": "company",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 255,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "tj1pcp7f",
        "name": "status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "lead",
            "client",
            "archived"
          ]
        }
      },
      {
        "system": false,
        "id": "fzeytpg2",
        "name": "notes",
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
        "id": "uoanz6wm",
        "name": "pipeline_stage",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "new",
            "contacted",
            "qualified",
            "proposal",
            "won",
            "lost"
          ]
        }
      },
      {
        "system": false,
        "id": "3lpiloxc",
        "name": "source",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 255,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "sppz1bg5",
        "name": "next_step",
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
        "id": "b4bopipx",
        "name": "last_activity_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "3istpijr",
        "name": "tags_json",
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
        "id": "rr4bnyxj",
        "name": "site",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "7l6kyk575n78m9c",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "no4aurmq",
        "name": "mailing_address_line1",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 255,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "3lwalnef",
        "name": "mailing_address_line2",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 255,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "tnvzlewx",
        "name": "mailing_city",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 120,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "c1h02dtc",
        "name": "mailing_state",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 120,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "xwywwufj",
        "name": "mailing_postal_code",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 30,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "jozunvit",
        "name": "mailing_country",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 120,
          "pattern": ""
        }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_crm_clients_user` ON `crm_clients` (`user`)",
      "CREATE INDEX `idx_crm_clients_status` ON `crm_clients` (`status`)"
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
  const collection = dao.findCollectionByNameOrId("44tmwrwuophbsqk");

  return dao.deleteCollection(collection);
})
