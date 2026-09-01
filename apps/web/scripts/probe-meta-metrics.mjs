#!/usr/bin/env node
/**
 * Probe Facebook Graph Insights metrics one at a time against a real Page.
 *
 * Meta fails an entire /insights request with error #100 when any single metric
 * name is invalid, so batching hides which name is dead. Every metric here is
 * requested on its own to get a per-metric verdict.
 *
 * Confirmed on Graph v25.0 (2026-09-01, Page token via Graph Explorer):
 *   OK page: page_follows, page_total_media_view_unique (day + days_28),
 *            page_post_engagements (day + days_28), page_daily_follows,
 *            page_daily_follows_unique, page_daily_unfollows_unique,
 *            page_media_view, page_views_total, page_total_actions,
 *            page_fan_adds_by_paid_non_paid_unique,
 *            page_lifetime_engaged_followers_unique
 *   OK post: post_total_media_view_unique, post_media_view,
 *            post_activity_by_action_type(_unique), post_reactions_*_total,
 *            post_clicks(_by_type), post_video_views
 *   OK fields: message, permalink_url, created_time, full_picture, status_type,
 *              attachments
 *   INVALID: page_fans_country/city/locale, page_impressions*,
 *            page_posts_impressions, post_impressions*, post_engaged_users,
 *            post_impressions_organic, post_impressions_paid
 *   PERMISSION (needs pages_read_user_content — do not request):
 *            likes.summary, comments.summary, reactions.summary
 *
 * Run: META_PROBE_TOKEN=... node scripts/probe-meta-metrics.mjs
 * Env: META_PROBE_TOKEN (user or Page token), META_PROBE_PAGE_ID (optional),
 *      META_GRAPH_API_VERSION (optional, default v25.0)
 * Flags: --json <path> to write raw results
 *
 * The token is never printed and never written to the JSON output.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
loadEnvFile(join(scriptDir, '..', '.env'))
loadEnvFile(join(scriptDir, '..', '..', '..', 'infra', '.env'))

const TOKEN = process.env.META_PROBE_TOKEN || process.env.META_PROBE_PAGE_TOKEN
const GRAPH_VERSION = (process.env.META_GRAPH_API_VERSION || 'v25.0').replace(/^v?/, 'v')
const BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

const jsonFlagIndex = process.argv.indexOf('--json')
const JSON_OUT = jsonFlagIndex > -1 ? process.argv[jsonFlagIndex + 1] : null

if (!TOKEN) {
  console.error('Set META_PROBE_TOKEN to a Page or User access token.')
  console.error('Get one from https://developers.facebook.com/tools/explorer/ (select your app + Page).')
  process.exit(1)
}

const VERDICT = {
  ok: 'OK',
  empty: 'EMPTY',
  invalid: 'INVALID',
  permission: 'PERMISSION',
  error: 'ERROR',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function redact(url) {
  try {
    const u = new URL(url)
    u.searchParams.delete('access_token')
    return u.pathname + u.search
  } catch {
    return '[invalid-url]'
  }
}

async function graph(path, query = {}, token = TOKEN) {
  const url = new URL(path.startsWith('http') ? path : `${BASE}/${path.replace(/^\//, '')}`)
  url.searchParams.set('access_token', token)
  for (const [k, v] of Object.entries(query)) {
    if (v == null || v === '') continue
    url.searchParams.set(k, String(v))
  }
  let res
  try {
    res = await fetch(url.toString())
  } catch (e) {
    return { error: { message: `network: ${e.message}` }, _path: redact(url.toString()) }
  }
  const json = await res.json().catch(() => ({}))
  return { ...json, _status: res.status, _path: redact(url.toString()) }
}

function classify(json) {
  const err = json?.error
  if (!err) return null
  const code = err.code
  const msg = String(err.message || '')
  // Meta reports an unknown metric name as code 100 with this phrasing.
  if (code === 100 && /must be a valid insights metric|nonexisting field|Unsupported get request/i.test(msg)) {
    return { verdict: VERDICT.invalid, code, message: msg }
  }
  if (code === 10 || code === 200 || /permission/i.test(msg)) {
    return { verdict: VERDICT.permission, code, message: msg }
  }
  if (code === 190 || code === 102) {
    return { verdict: VERDICT.error, code, message: `AUTH: ${msg}` }
  }
  if (code === 4 || code === 17 || code === 32) {
    return { verdict: VERDICT.error, code, message: `RATE LIMITED: ${msg}` }
  }
  return { verdict: VERDICT.error, code, message: msg }
}

function sampleValue(rows) {
  const row = Array.isArray(rows) ? rows[0] : null
  const values = row?.values
  if (!Array.isArray(values) || !values.length) return null
  const last = values[values.length - 1]
  return { value: last?.value, endTime: last?.end_time, count: values.length }
}

function fmt(v) {
  if (v == null) return '—'
  if (typeof v === 'object') {
    const entries = Object.entries(v)
    if (!entries.length) return '{}'
    return `{${entries.slice(0, 4).map(([k, n]) => `${k}:${n}`).join(', ')}${entries.length > 4 ? ', …' : ''}}`
  }
  return String(v)
}

const PAGE_METRICS = [
  // Currently used by WRR — regression check.
  { metric: 'page_follows', period: 'day', note: 'in use' },
  { metric: 'page_total_media_view_unique', period: 'days_28', note: 'in use (reach)' },
  { metric: 'page_post_engagements', period: 'days_28', note: 'in use (engagement)' },
  // Unlocks arbitrary report ranges if daily period is accepted.
  { metric: 'page_post_engagements', period: 'day', note: 'KEY: fixes 7/90-day ranges' },
  { metric: 'page_total_media_view_unique', period: 'day', note: 'daily reach' },
  // Candidate additions.
  { metric: 'page_daily_follows', period: 'day', note: 'true daily follows' },
  { metric: 'page_daily_follows_unique', period: 'day', note: 'daily follows (unique)' },
  { metric: 'page_daily_unfollows_unique', period: 'day', note: 'KEY: unfollows' },
  { metric: 'page_media_view', period: 'day', note: 'content views' },
  { metric: 'page_views_total', period: 'day', note: 'profile views' },
  { metric: 'page_total_actions', period: 'day', note: 'CTA clicks' },
  { metric: 'page_fan_adds_by_paid_non_paid_unique', period: 'day', note: 'paid vs organic likes' },
  { metric: 'page_fans_country', period: 'day', note: 'demographics' },
  { metric: 'page_fans_city', period: 'day', note: 'demographics' },
  { metric: 'page_fans_locale', period: 'day', note: 'demographics' },
  { metric: 'page_lifetime_engaged_followers_unique', period: 'day', note: 'engaged followers' },
  // Expected dead after the 2026-06-15 wave — confirming, not hoping.
  { metric: 'page_impressions', period: 'day', note: 'expect DEAD' },
  { metric: 'page_impressions_unique', period: 'day', note: 'expect DEAD' },
  { metric: 'page_posts_impressions', period: 'day', note: 'expect DEAD' },
]

const POST_METRICS = [
  { metric: 'post_total_media_view_unique', note: 'post reach' },
  { metric: 'post_media_view', note: 'post views' },
  { metric: 'post_activity_by_action_type', note: 'KEY: like/comment/share' },
  { metric: 'post_activity_by_action_type_unique', note: 'unique actors' },
  { metric: 'post_reactions_by_type_total', note: 'reaction breakdown' },
  { metric: 'post_reactions_like_total', note: 'reactions' },
  { metric: 'post_reactions_love_total', note: 'reactions' },
  { metric: 'post_reactions_wow_total', note: 'reactions' },
  { metric: 'post_reactions_haha_total', note: 'reactions' },
  { metric: 'post_reactions_sorry_total', note: 'reactions' },
  { metric: 'post_reactions_anger_total', note: 'reactions' },
  { metric: 'post_clicks', note: 'clicks' },
  { metric: 'post_clicks_by_type', note: 'clicks by type' },
  // Uncertain survivors — docs and Meta blog disagree.
  { metric: 'post_engaged_users', note: 'uncertain' },
  { metric: 'post_impressions_organic', note: 'uncertain' },
  { metric: 'post_impressions_paid', note: 'uncertain' },
  { metric: 'post_video_views', note: 'uncertain' },
  // Expected dead.
  { metric: 'post_impressions', note: 'expect DEAD' },
  { metric: 'post_impressions_unique', note: 'expect DEAD' },
]

const POST_FIELDS = [
  { field: 'message', note: 'post text' },
  { field: 'permalink_url', note: 'link' },
  { field: 'created_time', note: 'published at' },
  { field: 'full_picture', note: 'thumbnail' },
  { field: 'status_type', note: 'post kind' },
  { field: 'attachments{media_type,type,title,url}', note: 'media detail' },
  { field: 'shares', note: 'share count' },
  // These edges are the pages_read_user_content trap — confirm empirically.
  { field: 'likes.summary(true).limit(0)', note: 'expect PERMISSION' },
  { field: 'comments.summary(true).limit(0)', note: 'expect PERMISSION' },
  { field: 'reactions.summary(true).limit(0)', note: 'expect PERMISSION' },
]

function daysAgo(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

async function resolveTarget() {
  const me = await graph('me', { fields: 'id,name' })
  const meErr = classify(me)
  if (meErr && meErr.verdict === VERDICT.error) {
    throw new Error(`Token rejected: ${meErr.message}`)
  }

  const perms = await graph('me/permissions')
  const granted = Array.isArray(perms?.data)
    ? perms.data.filter((p) => p.status === 'granted').map((p) => p.permission)
    : []

  const wanted = process.env.META_PROBE_PAGE_ID
  const accounts = await graph('me/accounts', {
    fields: 'id,name,access_token,followers_count',
    limit: '100',
  })

  if (Array.isArray(accounts?.data) && accounts.data.length) {
    const page = wanted ? accounts.data.find((p) => p.id === wanted) : accounts.data[0]
    if (!page) throw new Error(`Page ${wanted} not found in /me/accounts`)
    return {
      tokenKind: 'user',
      pageId: page.id,
      pageName: page.name,
      pageToken: page.access_token || TOKEN,
      granted,
      availablePages: accounts.data.map((p) => ({ id: p.id, name: p.name })),
    }
  }

  // No accounts edge means this is already a Page token; /me is the Page.
  if (!me?.id) throw new Error('Could not resolve a Page from this token.')
  return {
    tokenKind: 'page',
    pageId: wanted || me.id,
    pageName: me.name || '(unknown)',
    pageToken: TOKEN,
    granted,
    availablePages: [],
  }
}

async function probePageMetrics(target) {
  const results = []
  for (const spec of PAGE_METRICS) {
    const json = await graph(`${target.pageId}/insights`, {
      metric: spec.metric,
      period: spec.period,
      since: daysAgo(27),
      until: daysAgo(0),
    }, target.pageToken)
    const err = classify(json)
    const sample = err ? null : sampleValue(json?.data)
    results.push({
      name: `${spec.metric} (${spec.period})`,
      metric: spec.metric,
      period: spec.period,
      note: spec.note,
      verdict: err ? err.verdict : sample ? VERDICT.ok : VERDICT.empty,
      code: err?.code ?? null,
      message: err?.message ?? null,
      sample: sample?.value ?? null,
      endTime: sample?.endTime ?? null,
      points: sample?.count ?? 0,
    })
    await sleep(120)
  }
  return results
}

async function findProbePost(target) {
  const posts = await graph(`${target.pageId}/posts`, {
    fields: 'id,created_time',
    limit: '10',
  }, target.pageToken)
  const err = classify(posts)
  if (err) return { error: err, post: null, total: 0 }
  const rows = Array.isArray(posts?.data) ? posts.data : []
  return { error: null, post: rows[0] || null, total: rows.length }
}

async function probePostMetrics(target, postId) {
  const results = []
  for (const spec of POST_METRICS) {
    const json = await graph(`${postId}/insights`, { metric: spec.metric }, target.pageToken)
    const err = classify(json)
    const sample = err ? null : sampleValue(json?.data)
    results.push({
      name: spec.metric,
      metric: spec.metric,
      note: spec.note,
      verdict: err ? err.verdict : sample ? VERDICT.ok : VERDICT.empty,
      code: err?.code ?? null,
      message: err?.message ?? null,
      sample: sample?.value ?? null,
    })
    await sleep(120)
  }
  return results
}

async function probePostFields(target, postId) {
  const results = []
  for (const spec of POST_FIELDS) {
    const json = await graph(postId, { fields: spec.field }, target.pageToken)
    const err = classify(json)
    const key = spec.field.split(/[.{(]/)[0]
    const raw = json?.[key]
    const present = raw !== undefined && raw !== null
    let sample = null
    if (present) {
      if (key === 'likes' || key === 'comments' || key === 'reactions') {
        sample = raw?.summary?.total_count ?? null
      } else if (key === 'shares') {
        sample = raw?.count ?? null
      } else if (key === 'attachments') {
        sample = raw?.data?.[0]?.media_type || raw?.data?.[0]?.type || null
      } else if (typeof raw === 'string') {
        sample = raw.length > 40 ? `${raw.slice(0, 40)}…` : raw
      } else {
        sample = fmt(raw)
      }
    }
    results.push({
      name: spec.field,
      note: spec.note,
      verdict: err ? err.verdict : present ? VERDICT.ok : VERDICT.empty,
      code: err?.code ?? null,
      message: err?.message ?? null,
      sample,
    })
    await sleep(120)
  }
  return results
}

async function probeExpansion(target, validPostMetrics) {
  if (!validPostMetrics.length) return { verdict: VERDICT.empty, message: 'no valid post metrics to expand' }
  const metricList = validPostMetrics.join(',')
  // Do not date-filter this check. Pages that last posted >28 days ago still
  // need to prove nested insights.metric(...) is accepted.
  const json = await graph(`${target.pageId}/posts`, {
    fields: `id,created_time,message,permalink_url,full_picture,insights.metric(${metricList})`,
    limit: '10',
  }, target.pageToken)
  const err = classify(json)
  if (err) return { verdict: err.verdict, message: err.message, code: err.code, metricList }
  const rows = Array.isArray(json?.data) ? json.data : []
  const withInsights = rows.filter((r) => Array.isArray(r?.insights?.data) && r.insights.data.length).length
  return {
    verdict: VERDICT.ok,
    postsReturned: rows.length,
    postsWithInsights: withInsights,
    metricList,
  }
}

function printTable(title, rows, columns) {
  console.log(`\n${title}`)
  console.log('-'.repeat(title.length))
  const widths = columns.map((c) =>
    Math.max(c.header.length, ...rows.map((r) => String(c.get(r) ?? '').length)),
  )
  const line = (cells) => cells.map((c, i) => String(c ?? '').padEnd(widths[i])).join('  ')
  console.log(line(columns.map((c) => c.header)))
  console.log(line(widths.map((w) => '-'.repeat(w))))
  for (const r of rows) console.log(line(columns.map((c) => c.get(r))))
}

async function main() {
  console.log(`Graph ${GRAPH_VERSION} — probing metrics one at a time\n`)

  const target = await resolveTarget()
  console.log(`Token kind:  ${target.tokenKind}`)
  console.log(`Page:        ${target.pageName} (${target.pageId})`)
  console.log(`Permissions: ${target.granted.length ? target.granted.join(', ') : '(none reported)'}`)
  if (target.availablePages.length > 1) {
    console.log(`Other Pages: ${target.availablePages.length - 1} more (set META_PROBE_PAGE_ID to switch)`)
  }

  const pageResults = await probePageMetrics(target)
  printTable('PAGE METRICS', pageResults, [
    { header: 'METRIC (period)', get: (r) => r.name },
    { header: 'VERDICT', get: (r) => r.verdict },
    { header: 'SAMPLE', get: (r) => fmt(r.sample) },
    { header: 'NOTE', get: (r) => r.note },
  ])

  const { post, error: postErr, total } = await findProbePost(target)
  let postMetricResults = []
  let postFieldResults = []
  let expansion = null

  if (postErr) {
    console.log(`\nPOSTS: could not list posts — ${postErr.verdict} (${postErr.code}): ${postErr.message}`)
  } else if (!post) {
    console.log('\nPOSTS: Page has no posts in the recent feed; post-level probes skipped.')
  } else {
    console.log(`\nProbe post: ${post.id} (published ${post.created_time || 'unknown'}, ${total} recent posts found)`)
    postMetricResults = await probePostMetrics(target, post.id)
    printTable('POST METRICS', postMetricResults, [
      { header: 'METRIC', get: (r) => r.name },
      { header: 'VERDICT', get: (r) => r.verdict },
      { header: 'SAMPLE', get: (r) => fmt(r.sample) },
      { header: 'NOTE', get: (r) => r.note },
    ])

    postFieldResults = await probePostFields(target, post.id)
    printTable('POST FIELDS & EDGES', postFieldResults, [
      { header: 'FIELD', get: (r) => r.name },
      { header: 'VERDICT', get: (r) => r.verdict },
      { header: 'SAMPLE', get: (r) => fmt(r.sample) },
      { header: 'NOTE', get: (r) => r.note },
    ])

    const validPostMetrics = postMetricResults
      .filter((r) => r.verdict === VERDICT.ok || r.verdict === VERDICT.empty)
      .map((r) => r.metric)
    expansion = await probeExpansion(target, validPostMetrics)
    console.log('\nFIELD EXPANSION (one call for posts + insights)')
    console.log('-'.repeat(46))
    console.log(`Verdict: ${expansion.verdict}`)
    if (expansion.postsReturned != null) {
      console.log(`Posts returned: ${expansion.postsReturned}, with insights: ${expansion.postsWithInsights}`)
    }
    if (expansion.message) console.log(`Message: ${expansion.message}`)
    console.log(`Metrics: ${expansion.metricList}`)
  }

  const usable = [...pageResults, ...postMetricResults].filter((r) => r.verdict === VERDICT.ok)
  const dead = [...pageResults, ...postMetricResults].filter((r) => r.verdict === VERDICT.invalid)
  const blocked = [...pageResults, ...postMetricResults, ...postFieldResults].filter(
    (r) => r.verdict === VERDICT.permission,
  )

  console.log(`\nSUMMARY: ${usable.length} returning data, ${dead.length} invalid, ${blocked.length} permission-blocked`)
  if (dead.length) console.log(`Invalid: ${dead.map((r) => r.name).join(', ')}`)
  if (blocked.length) console.log(`Blocked: ${blocked.map((r) => r.name).join(', ')}`)

  if (JSON_OUT) {
    writeFileSync(
      JSON_OUT,
      JSON.stringify(
        {
          graphVersion: GRAPH_VERSION,
          probedAt: new Date().toISOString(),
          page: { id: target.pageId, name: target.pageName },
          grantedPermissions: target.granted,
          pageMetrics: pageResults,
          postMetrics: postMetricResults,
          postFields: postFieldResults,
          expansion,
        },
        null,
        2,
      ),
    )
    console.log(`\nWrote ${JSON_OUT}`)
  }
}

main().catch((e) => {
  console.error(`\nProbe failed: ${e.message}`)
  process.exit(1)
})
