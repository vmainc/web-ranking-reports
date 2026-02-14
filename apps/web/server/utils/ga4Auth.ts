/**
 * GA4 API: auth user, assert site ownership, get token + property + date ranges.
 */

import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getGAAccessToken } from '~/server/utils/gaAccess'
import {
  getDateRange,
  getCompareDateRange,
  type DateRangePreset,
  type ComparePreset,
} from '~/server/utils/ga4Helpers'

export interface GA4Context {
  propertyId: string
  accessToken: string
  startDate: string
  endDate: string
  compareStartDate: string | null
  compareEndDate: string | null
}

export async function getGA4Context(event: { headers: { get: (n: string) => string | null }; context?: { ga4?: GA4Context } }): Promise<GA4Context> {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const { accessToken, integration } = await getGAAccessToken(pb, siteId)
  const propertyId = integration.config_json?.property_id as string | undefined
  if (!propertyId) throw createError({ statusCode: 400, message: 'Select a GA4 property first.' })

  const rangePreset = (query.range as DateRangePreset) || 'last_28_days'
  const comparePreset = (query.compare as ComparePreset) || 'previous_period'
  const { startDate, endDate } = getDateRange(
    rangePreset,
    query.startDate as string,
    query.endDate as string
  )
  const compareRange = getCompareDateRange(comparePreset, startDate, endDate)

  return {
    propertyId,
    accessToken,
    startDate,
    endDate,
    compareStartDate: compareRange?.startDate ?? null,
    compareEndDate: compareRange?.endDate ?? null,
  }
}
