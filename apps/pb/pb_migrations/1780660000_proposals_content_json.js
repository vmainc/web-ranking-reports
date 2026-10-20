/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  let collection
  try {
    collection = dao.findCollectionByNameOrId("proposals")
  } catch (e) {
    return
  }
  const fields = collection.schema.fields()
  if (fields.find((f) => f.name === "content_json")) return

  collection.schema.addField(
    new SchemaField({
      system: false,
      id: "pr0cntjson1",
      name: "content_json",
      type: "json",
      required: false,
      presentable: false,
      unique: false,
      options: { maxSize: 2000000 },
    }),
  )
  dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  try {
    const collection = dao.findCollectionByNameOrId("proposals")
    collection.schema.removeField("pr0cntjson1")
    dao.saveCollection(collection)
  } catch (e) {}
})
