/**
 * Compact derived SERP metadata retained with each ranking check.
 * Intentionally small — not a full raw SERP dump.
 */

export interface SerpOrganicTopDomain {
  rankGroup: number
  domain: string
  url: string
}

export interface SerpLocalPackSummaryItem {
  rankGroup: number
  title?: string
  domain?: string
  cid?: string
  phone?: string
}

export interface CompactSerpSummary {
  organicTopDomains: SerpOrganicTopDomain[]
  serpFeatureTypes: string[]
  localPack?: SerpLocalPackSummaryItem[]
  organicCount: number
  totalItems: number
}

type LooseItem = {
  type?: string
  rank_group?: number
  domain?: string
  url?: string
  title?: string
  phone?: string
  cid?: string
}

const TOP_ORGANIC_LIMIT = 10
const LOCAL_PACK_LIMIT = 5

export function buildCompactSerpSummary(items: LooseItem[]): CompactSerpSummary {
  const featureSet = new Set<string>()
  const organicTopDomains: SerpOrganicTopDomain[] = []
  const localPack: SerpLocalPackSummaryItem[] = []
  let organicCount = 0

  for (const item of items) {
    const type = typeof item.type === 'string' ? item.type : ''
    if (type) featureSet.add(type)

    if (type === 'organic') {
      organicCount += 1
      if (organicTopDomains.length < TOP_ORGANIC_LIMIT) {
        const rankGroup = typeof item.rank_group === 'number' ? item.rank_group : 0
        if (rankGroup > 0) {
          organicTopDomains.push({
            rankGroup,
            domain: item.domain || '',
            url: item.url || '',
          })
        }
      }
    }

    if (type === 'local_pack' && localPack.length < LOCAL_PACK_LIMIT) {
      const rankGroup = typeof item.rank_group === 'number' ? item.rank_group : 0
      if (rankGroup > 0) {
        localPack.push({
          rankGroup,
          title: item.title,
          domain: item.domain,
          cid: item.cid,
          phone: item.phone,
        })
      }
    }
  }

  organicTopDomains.sort((a, b) => a.rankGroup - b.rankGroup)

  const summary: CompactSerpSummary = {
    organicTopDomains,
    serpFeatureTypes: [...featureSet].sort(),
    organicCount,
    totalItems: items.length,
  }
  if (localPack.length) summary.localPack = localPack
  return summary
}
