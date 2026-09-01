/// <reference path="../pb_data/types.d.ts" />
/**
 * Facebook (and later IG) Page posts with lifetime Insights.
 * One row per connection + Meta post id; upserted on each sync.
 * Also: node apps/web/scripts/add-social-meta-collections.mjs
 */
migrate((db) => {
  const dao = new Dao(db)

  let sites
  try {
    sites = dao.findCollectionByNameOrId('sites')
  } catch (e) {
    return
  }

  let connections
  try {
    connections = dao.findCollectionByNameOrId('site_social_connections')
  } catch (e) {
    return
  }

  try {
    dao.findCollectionByNameOrId('social_posts')
    return
  } catch (e) {}

  const posts = new Collection({
    id: 'sposts01wrr0001',
    created: '2026-09-01 12:00:00.000Z',
    updated: '2026-09-01 12:00:00.000Z',
    name: 'social_posts',
    type: 'base',
    system: false,
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    schema: [
      {
        system: false,
        id: 'spssite00001',
        name: 'site',
        type: 'relation',
        required: true,
        presentable: false,
        unique: false,
        options: {
          collectionId: sites.id,
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: null,
        },
      },
      {
        system: false,
        id: 'spsconn00001',
        name: 'social_connection',
        type: 'relation',
        required: true,
        presentable: false,
        unique: false,
        options: {
          collectionId: connections.id,
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: null,
        },
      },
      {
        system: false,
        id: 'spsprovid001',
        name: 'provider',
        type: 'select',
        required: true,
        presentable: false,
        unique: false,
        options: { maxSelect: 1, values: ['meta'] },
      },
      {
        system: false,
        id: 'spsplatfm001',
        name: 'platform',
        type: 'select',
        required: true,
        presentable: false,
        unique: false,
        options: { maxSelect: 1, values: ['facebook', 'instagram'] },
      },
      {
        system: false,
        id: 'spsasset0001',
        name: 'asset_type',
        type: 'select',
        required: true,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ['facebook_page', 'instagram_business_account', 'ad_account'],
        },
      },
      {
        system: false,
        id: 'spsextid0001',
        name: 'external_post_id',
        type: 'text',
        required: true,
        presentable: false,
        unique: false,
        options: { min: null, max: 80, pattern: '' },
      },
      {
        system: false,
        id: 'spspubat0001',
        name: 'published_at',
        type: 'text',
        required: true,
        presentable: false,
        unique: false,
        options: { min: null, max: 40, pattern: '' },
      },
      {
        system: false,
        id: 'spsmsg000001',
        name: 'message',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 16000, pattern: '' },
      },
      {
        system: false,
        id: 'spsperm00001',
        name: 'permalink',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 1000, pattern: '' },
      },
      {
        system: false,
        id: 'spsmediau001',
        name: 'media_url',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 2000, pattern: '' },
      },
      {
        system: false,
        id: 'spsmediat01',
        name: 'media_type',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: 40, pattern: '' },
      },
      {
        system: false,
        id: 'spsreact0001',
        name: 'reactions',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: null, noDecimal: false },
      },
      {
        system: false,
        id: 'spscomm00001',
        name: 'comments',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: null, noDecimal: false },
      },
      {
        system: false,
        id: 'spsshare0001',
        name: 'shares',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: null, noDecimal: false },
      },
      {
        system: false,
        id: 'spsreach0001',
        name: 'reach',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: null, noDecimal: false },
      },
      {
        system: false,
        id: 'spsviews0001',
        name: 'views',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: null, noDecimal: false },
      },
      {
        system: false,
        id: 'spsclick0001',
        name: 'clicks',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: null, noDecimal: false },
      },
      {
        system: false,
        id: 'spsmetajson1',
        name: 'metrics_json',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: { maxSize: 20000 },
      },
      {
        system: false,
        id: 'spscollect01',
        name: 'collected_at',
        type: 'text',
        required: true,
        presentable: false,
        unique: false,
        options: { min: null, max: 40, pattern: '' },
      },
      {
        system: false,
        id: 'spssnapdt001',
        name: 'snapshot_date',
        type: 'text',
        required: true,
        presentable: false,
        unique: false,
        options: { min: null, max: 40, pattern: '' },
      },
      {
        system: false,
        id: 'spsdedupe001',
        name: 'dedupe_key',
        type: 'text',
        required: true,
        presentable: false,
        unique: false,
        options: { min: null, max: 400, pattern: '' },
      },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_social_posts_dedupe ON social_posts (dedupe_key)',
      'CREATE INDEX idx_social_posts_conn_published ON social_posts (social_connection, published_at)',
    ],
  })
  dao.saveCollection(posts)
}, (db) => {
  const dao = new Dao(db)
  try {
    dao.deleteCollection(dao.findCollectionByNameOrId('social_posts'))
  } catch (e) {}
})
