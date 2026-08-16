/**
 * Derived WRR metrics from stored snapshots — not requested from Meta.
 */
export function followerGrowth(opts: {
  beginningFollowers: number | null | undefined
  endingFollowers: number | null | undefined
}): number | null {
  if (opts.beginningFollowers == null || opts.endingFollowers == null) return null
  if (!Number.isFinite(opts.beginningFollowers) || !Number.isFinite(opts.endingFollowers)) return null
  return opts.endingFollowers - opts.beginningFollowers
}

export function followerGrowthPercent(opts: {
  beginningFollowers: number | null | undefined
  endingFollowers: number | null | undefined
}): number | null {
  const growth = followerGrowth(opts)
  if (growth == null || opts.beginningFollowers == null || opts.beginningFollowers === 0) return null
  return (growth / opts.beginningFollowers) * 100
}
