/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  try {
    dao.findCollectionByNameOrId("proposal_templates")
    return
  } catch (e) {}

  const collection = new Collection({
    id: "p8tpl8t3m4pl1",
    created: "2026-07-25 12:00:00.000Z",
    updated: "2026-07-25 12:00:00.000Z",
    name: "proposal_templates",
    type: "base",
    system: false,
    schema: [
      {
        system: false,
        id: "ptpluser01",
        name: "user",
        type: "relation",
        required: true,
        presentable: false,
        unique: false,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: null,
        },
      },
      {
        system: false,
        id: "ptplname01",
        name: "name",
        type: "text",
        required: true,
        presentable: true,
        unique: false,
        options: { min: 1, max: 255, pattern: "" },
      },
      {
        system: false,
        id: "ptpldesc01",
        name: "description",
        type: "text",
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 2000, pattern: "" },
      },
      {
        system: false,
        id: "ptplcnt001",
        name: "content_json",
        type: "json",
        required: false,
        presentable: false,
        unique: false,
        options: { maxSize: 2000000 },
      },
      {
        system: false,
        id: "ptpldef001",
        name: "is_default",
        type: "bool",
        required: false,
        presentable: false,
        unique: false,
        options: {},
      },
      {
        system: false,
        id: "ptplsort01",
        name: "sort_order",
        type: "number",
        required: false,
        presentable: false,
        unique: false,
        options: { min: 0, max: null, noDecimal: true },
      },
    ],
    indexes: ["CREATE INDEX `idx_proposal_templates_user` ON `proposal_templates` (`user`)"],
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: "@request.auth.id != \"\"",
    updateRule: "user = @request.auth.id",
    deleteRule: "user = @request.auth.id",
    options: {},
  })

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  try {
    const collection = dao.findCollectionByNameOrId("proposal_templates")
    return dao.deleteCollection(collection)
  } catch (e) {}
})
