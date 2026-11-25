import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { assertProposalWooLegacyEnabled } from '~/server/utils/proposalWooLegacy'

describe('assertProposalWooLegacyEnabled', () => {
  const prev = process.env.PROPOSAL_WOO_LEGACY_ENABLED

  afterEach(() => {
    if (prev === undefined) delete process.env.PROPOSAL_WOO_LEGACY_ENABLED
    else process.env.PROPOSAL_WOO_LEGACY_ENABLED = prev
  })

  it('throws 410 when legacy sync is disabled', () => {
    delete process.env.PROPOSAL_WOO_LEGACY_ENABLED
    expect(() => assertProposalWooLegacyEnabled()).toThrow()
  })

  it('allows when PROPOSAL_WOO_LEGACY_ENABLED=true', () => {
    process.env.PROPOSAL_WOO_LEGACY_ENABLED = 'true'
    expect(() => assertProposalWooLegacyEnabled()).not.toThrow()
  })
})