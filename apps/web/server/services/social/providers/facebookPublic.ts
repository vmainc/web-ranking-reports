import type {
  FacebookPageProfile,
  FacebookPublicMetrics,
  FetchContentOptions,
  ResolvedFacebookPage,
} from '~/server/services/social/types'
import {
  displayNameFromFacebookHint,
  facebookUrlAssetId,
  normalizeFacebookPageUrl,
} from '~/server/services/social/facebookUrl'
import { SocialErrorCode, SocialServiceError } from '~/server/services/social/errors'

export interface FacebookPublicPageProvider {
  id: string
  resolvePage(input: string): Promise<ResolvedFacebookPage>
  fetchProfile(page: ResolvedFacebookPage): Promise<FacebookPageProfile>
  fetchMetrics(page: ResolvedFacebookPage): Promise<FacebookPublicMetrics>
  fetchRecentContent?(page: ResolvedFacebookPage, options?: FetchContentOptions): Promise<never[]>
}

/**
 * Default public provider: URL normalization only.
 * Does not call Meta Graph (Page Public Content Access / App Review required for arbitrary Pages)
 * and does not scrape HTML. Metrics are honestly unavailable.
 */
export class UnavailableFacebookPublicPageProvider implements FacebookPublicPageProvider {
  id = 'unavailable'

  async resolvePage(input: string): Promise<ResolvedFacebookPage> {
    const normalized = normalizeFacebookPageUrl(input)
    if (!normalized) {
      throw new SocialServiceError({
        code: SocialErrorCode.PUBLIC_PAGE_NOT_FOUND,
        message: 'Facebook Page URL could not be normalized',
        httpStatus: 400,
      })
    }
    return {
      input,
      canonicalUrl: normalized.canonicalUrl,
      username: normalized.username,
      externalId: facebookUrlAssetId(normalized),
      displayName: displayNameFromFacebookHint(normalized.displayHint),
    }
  }

  async fetchProfile(page: ResolvedFacebookPage): Promise<FacebookPageProfile> {
    return {
      displayName: page.displayName,
      username: page.username,
      canonicalUrl: page.canonicalUrl,
      externalId: page.externalId,
    }
  }

  async fetchMetrics(_page: ResolvedFacebookPage): Promise<FacebookPublicMetrics> {
    return {}
  }
}

export function getFacebookPublicPageProvider(): FacebookPublicPageProvider {
  return new UnavailableFacebookPublicPageProvider()
}

export function publicMetricsUnavailableReason(): string {
  return 'Public Facebook Page metrics require Meta Page Public Content Access (App Review) or a configured public data provider. Connect Meta for Page Insights on Pages you manage.'
}
