/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  try {
    dao.findCollectionByNameOrId("proposal_service_packages")
    return
  } catch (e) {}

  const collection = new Collection({
    id: "p8rsvc5pkg9s01",
    created: "2026-11-24 21:00:00.000Z",
    updated: "2026-11-24 21:00:00.000Z",
    name: "proposal_service_packages",
    type: "base",
    system: false,
    schema: [
      {
        system: false,
        id: "psp0user01",
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
        id: "psp0sku001",
        name: "sku",
        type: "text",
        required: true,
        presentable: false,
        unique: false,
        options: { min: 1, max: 64, pattern: "" },
      },
      {
        system: false,
        id: "psp0name01",
        name: "name",
        type: "text",
        required: true,
        presentable: false,
        unique: false,
        options: { min: 1, max: 255, pattern: "" },
      },
      {
        system: false,
        id: "psp0desc01",
        name: "description_html",
        type: "text",
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 20000, pattern: "" },
      },
      {
        system: false,
        id: "psp0price1",
        name: "default_unit_price",
        type: "number",
        required: true,
        presentable: false,
        unique: false,
        options: { min: null, max: null, noDecimal: false },
      },
      {
        system: false,
        id: "psp0bill01",
        name: "billing_interval",
        type: "select",
        required: true,
        presentable: false,
        unique: false,
        options: { maxSelect: 1, values: ["one_time", "month", "year"] },
      },
      {
        system: false,
        id: "psp0cat001",
        name: "category",
        type: "select",
        required: false,
        presentable: false,
        unique: false,
        options: { maxSelect: 1, values: ["monthly_plan", "one_time_project", "add_on"] },
      },
      {
        system: false,
        id: "psp0sort01",
        name: "sort_order",
        type: "number",
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: null, noDecimal: false },
      },
      {
        system: false,
        id: "psp0active1",
        name: "active",
        type: "bool",
        required: false,
        presentable: false,
        unique: false,
        options: {},
      },
      {
        system: false,
        id: "psp0strp01",
        name: "stripe_product_id",
        type: "text",
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 128, pattern: "" },
      },
      {
        system: false,
        id: "psp0strp02",
        name: "stripe_price_id",
        type: "text",
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 128, pattern: "" },
      },
    ],
    indexes: [
      "CREATE INDEX `idx_proposal_service_packages_user` ON `proposal_service_packages` (`user`)",
      "CREATE UNIQUE INDEX `idx_proposal_service_packages_sku` ON `proposal_service_packages` (`user`, `sku`)",
    ],
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: '@request.auth.id != ""',
    updateRule: "user = @request.auth.id",
    deleteRule: "user = @request.auth.id",
  })

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  try {
    const collection = dao.findCollectionByNameOrId("proposal_service_packages")
    return dao.deleteCollection(collection)
  } catch (e) {}
})