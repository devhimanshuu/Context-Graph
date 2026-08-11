import { describe, expect, it } from 'vitest'
import { ComplianceClearance, ComplianceTag } from '@contextgraph/types'
import { ComplianceRule } from './compliance.rule'
import { makeDefinition, makeNode, makeRuleContext } from '../testing/rule-engine-fixtures'
import { RULE_ID } from '../configuration/rule-ids'
import { makeContext } from '../../authorization/testing/authorization-fixtures'
import { tagsImpliedByClearance } from '../../authorization/domain/compliance'

function makeRule() {
  return new ComplianceRule(makeDefinition({ id: RULE_ID.COMPLIANCE }))
}

describe('ComplianceRule', () => {
  it('passes a node with no compliance tags', () => {
    const result = makeRule().evaluate(makeRuleContext(), makeNode({ complianceTags: [] }))
    expect(result.passed).toBe(true)
    expect(result.metadata).toMatchObject({ applicable: false })
  })

  it('passes a node whose tags the principal clears', () => {
    const context = makeRuleContext()
    const result = makeRule().evaluate(
      context,
      makeNode({ complianceTags: [ComplianceTag.INTERNAL, ComplianceTag.CONFIDENTIAL] }),
    )
    expect(result.passed).toBe(true)
  })

  it('fails a node with a tag the principal lacks (MISSING_CLEARANCE)', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ complianceTags: [ComplianceTag.RESTRICTED] }),
    )
    expect(result.passed).toBe(false)
    expect(result.reasonCode).toBe('MISSING_CLEARANCE')
    expect(result.metadata).toMatchObject({ missingTags: [ComplianceTag.RESTRICTED] })
  })

  it('fails when only one of several tags is missing', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({
        complianceTags: [ComplianceTag.INTERNAL, ComplianceTag.PCI_DSS, ComplianceTag.CONFIDENTIAL],
      }),
    )
    expect(result.passed).toBe(false)
    expect(result.reasonCode).toBe('MISSING_CLEARANCE')
    expect(result.metadata?.missingTags).toEqual([ComplianceTag.PCI_DSS])
  })

  it('passes every tag for a CRITICAL-clearance principal', () => {
    const context = makeRuleContext({
      authorization: makeContext({
        complianceClearance: ComplianceClearance.CRITICAL,
        effectiveComplianceTags: new Set(tagsImpliedByClearance(ComplianceClearance.CRITICAL)),
      }),
    })
    const result = makeRule().evaluate(
      context,
      makeNode({ complianceTags: [ComplianceTag.RESTRICTED, ComplianceTag.PCI_DSS] }),
    )
    expect(result.passed).toBe(true)
  })
})
