import type { SocialAccessType, SocialCapabilities, SocialConnectionStatus } from '~/server/services/social/types'
import { getFacebookPublicPageProvider } from '~/server/services/social/providers/facebookPublic'

export function capabilitiesForAccessType(
  accessType: SocialAccessType | null | undefined,
  status?: SocialConnectionStatus | string,
): SocialCapabilities {
  const reconnecting = status === 'reconnect_required' || status === 'disconnected' || status === 'expired'
  const authenticated = accessType === 'authenticated' && !reconnecting
  const publicTrack = accessType === 'public' || authenticated
  return {
    followers: publicTrack,
    reach: authenticated,
    engagement: authenticated,
    posts: authenticated,
    ads: false,
    instagram: false,
  }
}

export function isPublicFacebookProviderAvailable(): boolean {
  return getFacebookPublicPageProvider().id !== 'unavailable'
}
