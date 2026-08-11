import { describe, expect, it } from 'vitest'
import { NodeType } from '@contextgraph/types'
import { DerivabilityRule } from './derivability.rule'
import { DeterministicDerivabilityEvaluator } from '../evaluators/derivability.evaluator'
import { makeDefinition, makeNode, makeRuleContext } from '../testing/rule-engine-fixtures'
import { RULE_ID } from '../configuration/rule-ids'

function makeRule(threshold = 80) {
  return new DerivabilityRule(
    makeDefinition({
      id: RULE_ID.DERIVABILITY,
      configuration: { defaultThreshold: threshold },
    }),
    new DeterministicDerivabilityEvaluator(),
  )
}

describe('DerivabilityRule', () => {
  it('removes highly derivable content (score above threshold)', () => {
    const result = makeRule().evaluate(makeRuleContext(), makeNode({ derivabilityScore: 95 }))
    expect(result.passed).toBe(false)
    expect(result.reasonCode).toBe('DERIVABLE_CONTENT')
  })

  it('keeps organization-specific content (score below threshold)', () => {
    const result = makeRule().evaluate(makeRuleContext(), makeNode({ derivabilityScore: 30 }))
    expect(result.passed).toBe(true)
  })

  it('treats the threshold boundary as derivable (score >= threshold)', () => {
    const result = makeRule(80).evaluate(makeRuleContext(), makeNode({ derivabilityScore: 80 }))
    expect(result.passed).toBe(false)
  })

  it('keeps a node with an explicit keep flag regardless of score', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ derivabilityScore: 100, metadata: { keep: true } }),
    )
    expect(result.passed).toBe(true)
  })

  it('removes a node with an explicit discard flag regardless of score', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ derivabilityScore: 0, metadata: { keep: false } }),
    )
    expect(result.passed).toBe(false)
    expect(result.reasonCode).toBe('DERIVABLE_CONTENT')
  })

  it('assumes a bare FACT with no score is derivable', () => {
    const result = makeRule().evaluate(makeRuleContext(), makeNode({ type: NodeType.FACT }))
    expect(result.passed).toBe(false)
  })

  it('preserves CONSTRAINT/DECISION/ANTI_PATTERN with no score (organization-specific)', () => {
    for (const type of [NodeType.CONSTRAINT, NodeType.DECISION, NodeType.ANTI_PATTERN]) {
      const result = makeRule().evaluate(makeRuleContext(), makeNode({ type }))
      expect(result.passed).toBe(true)
    }
  })

  it('respects a custom threshold from rule configuration', () => {
    const result = makeRule(50).evaluate(makeRuleContext(), makeNode({ derivabilityScore: 60 }))
    expect(result.passed).toBe(false)
  })

  it('is deterministic', () => {
    const rule = makeRule()
    const context = makeRuleContext()
    const node = makeNode({ derivabilityScore: 90 })
    expect(rule.evaluate(context, node)).toEqual(rule.evaluate(context, node))
  })
})
