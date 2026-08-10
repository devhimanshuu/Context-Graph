import { describe, expect, it } from 'vitest'
import { ComplianceClearance, ComplianceTag } from '@contextgraph/types'
import {
  COMPLIANCE_TAG_MINIMUM_CLASS,
  clearanceDominates,
  clearanceRank,
  satisfiesTags,
  tagsImpliedByClearance,
} from './compliance'

describe('clearanceRank', () => {
  it('orders clearance classes hierarchically', () => {
    expect(clearanceRank(ComplianceClearance.NONE)).toBe(0)
    expect(clearanceRank(ComplianceClearance.STANDARD)).toBe(1)
    expect(clearanceRank(ComplianceClearance.SENSITIVE)).toBe(2)
    expect(clearanceRank(ComplianceClearance.RESTRICTED)).toBe(3)
    expect(clearanceRank(ComplianceClearance.CRITICAL)).toBe(4)
  })

  it('dominates only at or above', () => {
    expect(clearanceDominates(ComplianceClearance.CRITICAL, ComplianceClearance.RESTRICTED)).toBe(
      true,
    )
    expect(clearanceDominates(ComplianceClearance.SENSITIVE, ComplianceClearance.SENSITIVE)).toBe(
      true,
    )
    expect(clearanceDominates(ComplianceClearance.SENSITIVE, ComplianceClearance.RESTRICTED)).toBe(
      false,
    )
  })
})

describe('COMPLIANCE_TAG_MINIMUM_CLASS', () => {
  it('keeps PUBLIC at the lowest class and RESTRICTED at the high class', () => {
    expect(COMPLIANCE_TAG_MINIMUM_CLASS[ComplianceTag.PUBLIC]).toBe(ComplianceClearance.NONE)
    expect(COMPLIANCE_TAG_MINIMUM_CLASS[ComplianceTag.RESTRICTED]).toBe(
      ComplianceClearance.RESTRICTED,
    )
  })
})

describe('tagsImpliedByClearance', () => {
  it('implies exactly PUBLIC at NONE', () => {
    expect(tagsImpliedByClearance(ComplianceClearance.NONE)).toEqual(
      new Set([ComplianceTag.PUBLIC]),
    )
  })

  it('implies SENSITIVE tags but not RESTRICTED at SENSITIVE', () => {
    const implied = tagsImpliedByClearance(ComplianceClearance.SENSITIVE)
    expect(implied.has(ComplianceTag.CONFIDENTIAL)).toBe(true)
    expect(implied.has(ComplianceTag.PHI)).toBe(true)
    expect(implied.has(ComplianceTag.INTERNAL)).toBe(true)
    expect(implied.has(ComplianceTag.RESTRICTED)).toBe(false)
  })

  it('is monotonic across the lattice', () => {
    const low = tagsImpliedByClearance(ComplianceClearance.STANDARD)
    const high = tagsImpliedByClearance(ComplianceClearance.CRITICAL)
    for (const tag of low) {
      expect(high.has(tag)).toBe(true)
    }
  })
})

describe('satisfiesTags', () => {
  it('passes when every required tag is present', () => {
    const tags = new Set([ComplianceTag.PHI, ComplianceTag.CONFIDENTIAL])
    expect(satisfiesTags(tags, [ComplianceTag.PHI])).toBe(true)
    expect(satisfiesTags(tags, [ComplianceTag.PHI, ComplianceTag.CONFIDENTIAL])).toBe(true)
  })

  it('fails when any required tag is missing', () => {
    const tags = new Set([ComplianceTag.PHI])
    expect(satisfiesTags(tags, [ComplianceTag.PHI, ComplianceTag.CONFIDENTIAL])).toBe(false)
  })

  it('passes vacuously for untagged resources', () => {
    expect(satisfiesTags(new Set(), [])).toBe(true)
  })
})
