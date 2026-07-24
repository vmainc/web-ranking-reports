/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  try {
    dao.findCollectionByNameOrId("proposals")
    return
  } catch (e) {}

  const sites = dao.findCollectionByNameOrId("sites")
  const clients = dao.findCollectionByNameOrId("crm_clients")
  const sales = dao.findCollectionByNameOrId("crm_sales")

  const collection = new Collection({
    "id": "p8r0p0s4l5x7m2n",
    "created": "2026-07-23 15:00:00.000Z",
    "updated": "2026-07-23 15:00:00.000Z",
    "name": "proposals",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "pr0user001",
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
        "id": "pr0client01",
        "name": "client",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": clients.id,
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "pr0sale0001",
        "name": "sale",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": sales.id,
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "pr0site0001",
        "name": "site",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": sites.id,
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "pr0version1",
        "name": "version",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": null,
          "noDecimal": true
        }
      },
      {
        "system": false,
        "id": "pr0status01",
        "name": "status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "draft",
            "sent",
            "viewed",
            "accepted",
            "declined",
            "superseded",
            "expired"
          ]
        }
      },
      {
        "system": false,
        "id": "pr0title001",
        "name": "title",
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
        "id": "pr0intro001",
        "name": "intro_html",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 50000,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "pr0terms001",
        "name": "terms_html",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 50000,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "pr0currenc1",
        "name": "currency",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": 8,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "pr0subtot01",
        "name": "subtotal",
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
        "id": "pr0total001",
        "name": "total",
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
        "id": "pr0validu01",
        "name": "valid_until",
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
        "id": "pr0snapsh01",
        "name": "snapshot_json",
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
        "id": "pr0brandg01",
        "name": "branding_json",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 200000
        }
      },
      {
        "system": false,
        "id": "pr0token001",
        "name": "public_token",
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
        "id": "pr0sentat01",
        "name": "sent_at",
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
        "id": "pr0viewat01",
        "name": "viewed_at",
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
        "id": "pr0accpat01",
        "name": "accepted_at",
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
        "id": "pr0declat01",
        "name": "declined_at",
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
        "id": "pr0accnam01",
        "name": "accepted_by_name",
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
        "id": "pr0acceml01",
        "name": "accepted_by_email",
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
        "id": "pr0accopt01",
        "name": "acceptance_options_json",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 50000
        }
      },
      {
        "system": false,
        "id": "pr0pdffn001",
        "name": "pdf_filename",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 255,
          "pattern": ""
        }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_proposals_user` ON `proposals` (`user`)",
      "CREATE INDEX `idx_proposals_client` ON `proposals` (`client`)",
      "CREATE INDEX `idx_proposals_sale` ON `proposals` (`sale`)",
      "CREATE UNIQUE INDEX `idx_proposals_sale_version` ON `proposals` (`sale`, `version`)",
      "CREATE INDEX `idx_proposals_public_token` ON `proposals` (`public_token`)"
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
    const collection = dao.findCollectionByNameOrId("proposals");
    return dao.deleteCollection(collection);
  } catch (e) {}
})
