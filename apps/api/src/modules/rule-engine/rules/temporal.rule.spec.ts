import { describe, expect, it } from 'vitest'
import { NodeStatus } from '@contextgraph/types'
import { TemporalRule } from './temporal.rule'
import {
  makeDefinition,
  makeNode,
  makeRuleContext,
  EVALUATED_AT,
} from '../testing/rule-engine-fixtures'
import { RULE_ID } from '../configuration/rule-ids'

function makeRule() {
  return new TemporalRule(makeDefinition({ id: RULE_ID.TEMPORAL }))
}

// EVALUATED_AT is 2026-06-15T12:00:00.000Z
const BEFORE = '2026-01-01T00:00:00.000Z'
const AFTER = '2027-01-01T00:00:00.000Z'

describe('TemporalRule', () => {
  it('passes an ACTIVE node with no validity window', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ status: NodeStatus.ACTIVE, validFrom: null, validTo: null }),
    )
    expect(result.passed).toBe(true)
  })

  it('passes an ACTIVE node inside its window (inclusive bounds)', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ status: NodeStatus.ACTIVE, validFrom: BEFORE, validTo: AFTER }),
    )
    expect(result.passed).toBe(true)
  })

  it('passes on the exact boundary instants (inclusive)', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ status: NodeStatus.ACTIVE, validFrom: EVALUATED_AT, validTo: EVALUATED_AT }),
    )
    expect(result.passed).toBe(true)
  })

  it('fails a node whose validTo has passed (EXPIRED_NODE)', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ status: NodeStatus.ACTIVE, validFrom: BEFORE, validTo: BEFORE }),
    )
    expect(result.passed).toBe(false)
    expect(result.reasonCode).toBe('EXPIRED_NODE')
  })

  it('fails a future-effective node (FUTURE_EFFECTIVE_NODE)', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ status: NodeStatus.ACTIVE, validFrom: AFTER, validTo: null }),
    )
    expect(result.passed).toBe(false)
    expect(result.reasonCode).toBe('FUTURE_EFFECTIVE_NODE')
  })

  it('fails a SUPERSEDED node regardless of dates', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ status: NodeStatus.SUPERSEDED, validFrom: BEFORE, validTo: AFTER }),
    )
    expect(result.passed).toBe(false)
    expect(result.reasonCode).toBe('SUPERSEDED_NODE')
  })

  it('fails an EXPIRED node regardless of dates', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ status: NodeStatus.EXPIRED, validFrom: BEFORE, validTo: AFTER }),
    )
    expect(result.passed).toBe(false)
    expect(result.reasonCode).toBe('EXPIRED_NODE')
  })

  it('fails DRAFT and ARCHIVED nodes (NOT_ACTIVE — fail secure)', () => {
    for (const status of [NodeStatus.DRAFT, NodeStatus.ARCHIVED]) {
      const result = makeRule().evaluate(makeRuleContext(), makeNode({ status }))
      expect(result.passed).toBe(false)
      expect(result.reasonCode).toBe('NOT_ACTIVE')
    }
  })

  it('keeps a LEGAL_HOLD node even outside its window (legal hold overrides expiry)', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ status: NodeStatus.LEGAL_HOLD, validFrom: BEFORE, validTo: BEFORE }),
    )
    expect(result.passed).toBe(true)
    expect(result.metadata).toMatchObject({ legalHold: true })
  })

  it('keeps a REVIEW_REQUIRED node and flags it', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ status: NodeStatus.REVIEW_REQUIRED, validFrom: BEFORE, validTo: AFTER }),
    )
    expect(result.passed).toBe(true)
    expect(result.metadata).toMatchObject({ reviewRequired: true })
  })

  it('respects legalHoldOverridesExpiry=false', () => {
    const rule = new TemporalRule(
      makeDefinition({
        id: RULE_ID.TEMPORAL,
        configuration: { legalHoldOverridesExpiry: false },
      }),
    )
    const result = rule.evaluate(
      makeRuleContext(),
      makeNode({ status: NodeStatus.LEGAL_HOLD, validFrom: BEFORE, validTo: BEFORE }),
    )
    expect(result.passed).toBe(false)
    expect(result.reasonCode).toBe('EXPIRED_NODE')
  })

  it('is deterministic: same inputs, same result', () => {
    const rule = makeRule()
    const context = makeRuleContext()
    const node = makeNode({ status: NodeStatus.SUPERSEDED })
    expect(rule.evaluate(context, node)).toEqual(rule.evaluate(context, node))
  })
})
