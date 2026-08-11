import { describe, expect, it } from 'vitest'
import { NodeType } from '@contextgraph/types'
import { DerivabilityReason, DeterministicDerivabilityEvaluator } from './derivability.evaluator'
import { makeNode } from '../testing/rule-engine-fixtures'

const evaluator = new DeterministicDerivabilityEvaluator()
const EMPTY_CONFIG = {}

describe('DeterministicDerivabilityEvaluator', () => {
  it('honors an explicit keep flag over any score', () => {
    const decision = evaluator.evaluate(
      makeNode({ derivabilityScore: 100, metadata: { keep: true } }),
      EMPTY_CONFIG,
    )
    expect(decision).toMatchObject({ derivable: false, reason: DerivabilityReason.EXPLICIT_KEEP })
  })

  it('honors an explicit discard flag over any score', () => {
    const decision = evaluator.evaluate(
      makeNode({ derivabilityScore: 0, metadata: { keep: false } }),
      EMPTY_CONFIG,
    )
    expect(decision).toMatchObject({ derivable: true, reason: DerivabilityReason.EXPLICIT_DISCARD })
  })

  it('classifies score at/above the default threshold as derivable', () => {
    expect(evaluator.evaluate(makeNode({ derivabilityScore: 80 }), EMPTY_CONFIG).derivable).toBe(
      true,
    )
    expect(evaluator.evaluate(makeNode({ derivabilityScore: 79 }), EMPTY_CONFIG).derivable).toBe(
      false,
    )
  })

  it('uses the configured threshold', () => {
    const decision = evaluator.evaluate(makeNode({ derivabilityScore: 60 }), {
      defaultThreshold: 50,
    })
    expect(decision).toMatchObject({
      derivable: true,
      reason: DerivabilityReason.SCORE_ABOVE_THRESHOLD,
    })
  })

  it('falls back to type when no score: FACT derivable, others preserved', () => {
    expect(evaluator.evaluate(makeNode({ type: NodeType.FACT }), EMPTY_CONFIG).derivable).toBe(true)
    for (const type of [NodeType.CONSTRAINT, NodeType.DECISION, NodeType.ANTI_PATTERN]) {
      expect(evaluator.evaluate(makeNode({ type }), EMPTY_CONFIG).derivable).toBe(false)
    }
  })

  it('clamps an out-of-range threshold to 0-100', () => {
    // 200 clamps to 100 → score 90 is below it.
    expect(
      evaluator.evaluate(makeNode({ derivabilityScore: 90 }), { defaultThreshold: 200 }).derivable,
    ).toBe(false)
    // -10 clamps to 0 → every score is at/above it.
    expect(
      evaluator.evaluate(makeNode({ derivabilityScore: 0 }), { defaultThreshold: -10 }).derivable,
    ).toBe(true)
  })

  it('is deterministic', () => {
    const node = makeNode({ derivabilityScore: 55 })
    expect(evaluator.evaluate(node, EMPTY_CONFIG)).toEqual(evaluator.evaluate(node, EMPTY_CONFIG))
  })
})
