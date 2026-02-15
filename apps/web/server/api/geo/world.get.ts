const WORLD_GEO_URL = 'https://echarts.apache.org/examples/data/asset/geo/world.json'

export default defineEventHandler(async () => {
  const res = await fetch(WORLD_GEO_URL)
  if (!res.ok) throw createError({ statusCode: 502, message: 'Failed to load world map data' })
  const json = await res.json()
  return json
})
