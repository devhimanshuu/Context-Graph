import { describe, expect, it, vi } from 'vitest'
import { ComplianceTag, NodeStatus, NodeType } from '@contextgraph/types'
import { RulePipeline } from './rule-pipeline'
import {
  GlobalKnowledgeInjector,
  type IGlobalKnowledgeProvider,
} from '../injectors/global-knowledge.injector'
import { IsolationRule } from '../rules/isolation.rule'
import { ComplianceRule } from '../rules/compliance.rule'
import { PermissionRule } from '../rules/permission.rule'
import { TemporalRule } from '../rules/temporal.rule'
import { DerivabilityRule } from '../rules/derivability.rule'
import { DeterministicDerivabilityEvaluator } from '../evaluators/derivability.evaluator'
import { RULE_ID } from '../configuration/rule-ids'
import {
  makeDefinition,
  makeEvaluator,
  makeNode,
  makeRuleContext,
} from '../testing/rule-engine-fixtures'
import { ORG_B, DEPT_FINANCE } from '../../authorization/testing/authorization-fixtures'
import { InclusionReason } from '../domain/inclusion-reason'
import type { RuleCandidateNode } from '../domain/candidate-node'

/** Builds the default 5-rule pipeline (isolation → compliance → permission → temporal → derivability). */
function buildDefaultPipeline(globalNodes: readonly RuleCandidateNode[] = []): RulePipeline {
  const provider = {
    findGlobalNodes: vi.fn(async () => globalNodes),
  } as unknown as IGlobalKnowledgeProvider
  const injector = new GlobalKnowledgeInjector(provider)
  const evaluator = makeEvaluator()
  const rules = [
    new IsolationRule(makeDefinition({ id: RULE_ID.ISOLATION, priority: 20 })),
    new ComplianceRule(makeDefinition({ id: RULE_ID.COMPLIANCE, priority: 30 })),
    new PermissionRule(makeDefinition({ id: RULE_ID.PERMISSION, priority: 40 }), evaluator),
    new TemporalRule(makeDefinition({ id: RULE_ID.TEMPORAL, priority: 50 })),
    new DerivabilityRule(
      makeDefinition({
        id: RULE_ID.DERIVABILITY,
        priority: 60,
        configuration: { defaultThreshold: 80 },
      }),
      new DeterministicDerivabilityEvaluator(),
    ),
  ]
  return new RulePipeline(injector, rules)
}

/** Builds N distinct nodes of a given kind. */
function nodes(
  count: number,
  overrides: (index: number) => Partial<RuleCandidateNode>,
): RuleCandidateNode[] {
  return Array.from({ length: count }, (_, index) =>
    makeNode({ id: `n-${index}`, ...overrides(index) }),
  )
}

const SURVIVOR = {
  type: NodeType.CONSTRAINT,
  derivabilityScore: 30,
} as const

describe('RulePipeline', () => {
  it('executes the full funnel with exact intermediate counts (120 → 28)', async () => {
    const input: RuleCandidateNode[] = [
      // Removed by isolation (5): foreign organization.
      ...nodes(5, (i) => ({ id: `foreign-${i}`, organizationId: ORG_B })),
      // Removed by compliance (15): restricted tag.
      ...nodes(15, (i) => ({ id: `restricted-${i}`, complianceTags: [ComplianceTag.RESTRICTED] })),
      // Removed by permission (25): finance department outside the principal's scope.
      ...nodes(25, (i) => ({ id: `finance-${i}`, departmentId: DEPT_FINANCE })),
      // Removed by temporal (18): 10 expired + 8 superseded.
      ...nodes(10, (i) => ({ id: `expired-${i}`, status: NodeStatus.EXPIRED })),
      ...nodes(8, (i) => ({ id: `superseded-${i}`, status: NodeStatus.SUPERSEDED })),
      // Removed by derivability (44): CONSTRAINTs with a high genericness score.
      ...nodes(44, (i) => ({
        id: `generic-${i}`,
        type: NodeType.CONSTRAINT,
        derivabilityScore: 90,
      })),
      // Survivors (13): organization-specific constraints.
      ...nodes(13, (i) => ({ id: `keep-${i}`, ...SURVIVOR })),
    ]
    // Global injection (15): organization-wide policy, all pass every rule.
    const global = nodes(15, (i) => ({
      id: `global-${i}`,
      ...SURVIVOR,
      inclusionReason: InclusionReason.GLOBAL_POLICY,
    }))

    const context = makeRuleContext({ entryNodeIds: ['keep-0'] })
    const result = await buildDefaultPipeline(global).execute(context, input)

    expect(input).toHaveLength(120)
    expect(result.metrics.initialCount).toBe(120)
    expect(result.metrics.injectedCount).toBe(15)
    expect(result.metrics.finalCount).toBe(28)

    // The exact funnel from the spec.
    const funnel = Object.fromEntries(
      result.metrics.countsAfterStage.map((stage) => [stage.stageId, stage.count]),
    )
    expect(funnel).toEqual({
      'global-injection': 135,
      isolation: 130,
      compliance: 115,
      permission: 90,
      temporal: 72,
      derivability: 28,
    })

    // Per-rule removal counts.
    expect(result.metrics.removedByRule).toEqual({
      isolation: 5,
      compliance: 15,
      permission: 25,
      temporal: 18,
      derivability: 44,
    })

    // Final candidates are exactly the survivors + injected globals.
    expect(result.candidates.map((node) => node.id)).toEqual([
      ...Array.from({ length: 13 }, (_, i) => `keep-${i}`),
      ...Array.from({ length: 15 }, (_, i) => `global-${i}`),
    ])

    // Every excluded node carries the failing rule + reason.
    const explanations = new Map(result.explanations.map((e) => [e.nodeId, e]))
    expect(explanations.get('foreign-0')).toMatchObject({
      included: false,
      finalReasonCode: 'ORG_MISMATCH',
      failingRuleId: 'isolation',
    })
    expect(explanations.get('restricted-0')).toMatchObject({
      included: false,
      finalReasonCode: 'MISSING_CLEARANCE',
      failingRuleId: 'compliance',
    })
    expect(explanations.get('finance-0')).toMatchObject({
      included: false,
      finalReasonCode: 'INSUFFICIENT_PERMISSION',
      failingRuleId: 'permission',
    })
    expect(explanations.get('expired-0')).toMatchObject({
      included: false,
      finalReasonCode: 'EXPIRED_NODE',
      failingRuleId: 'temporal',
    })
    expect(explanations.get('superseded-0')).toMatchObject({
      included: false,
      finalReasonCode: 'SUPERSEDED_NODE',
      failingRuleId: 'temporal',
    })
    expect(explanations.get('generic-0')).toMatchObject({
      included: false,
      finalReasonCode: 'DERIVABLE_CONTENT',
      failingRuleId: 'derivability',
    })
    expect(explanations.get('keep-0')).toMatchObject({
      included: true,
      finalReasonCode: null,
      failingRuleId: null,
    })
    // A surviving node ran all five rules and passed each.
    expect(explanations.get('keep-0')?.ruleResults).toHaveLength(5)
    expect(explanations.get('keep-0')?.ruleResults.every((r) => r.passed)).toBe(true)
  })

  it('is deterministic: identical inputs produce identical outputs', async () => {
    const pipeline = buildDefaultPipeline()
    const context = makeRuleContext({ evaluatedAt: '2026-06-15T12:00:00.000Z' })
    const input = [
      makeNode({ id: 'a', ...SURVIVOR }),
      makeNode({ id: 'b', organizationId: ORG_B }),
      makeNode({ id: 'c', complianceTags: [ComplianceTag.RESTRICTED] }),
    ]
    const first = await pipeline.execute(context, input)
    const second = await pipeline.execute(context, input)

    expect(second.candidates).toEqual(first.candidates)
    expect(second.explanations).toEqual(first.explanations)
    expect(second.metrics.countsAfterStage).toEqual(first.metrics.countsAfterStage)
    expect(second.metrics.removedByReason).toEqual(first.metrics.removedByReason)
  })

  it('executes rules in explicit priority order, not construction order', async () => {
    const pipeline = new RulePipeline(
      new GlobalKnowledgeInjector({
        findGlobalNodes: async () => [],
      } as unknown as IGlobalKnowledgeProvider),
      [
        // Deliberately constructed out of order.
        new DerivabilityRule(
          makeDefinition({
            id: RULE_ID.DERIVABILITY,
            priority: 60,
            configuration: { defaultThreshold: 80 },
          }),
          new DeterministicDerivabilityEvaluator(),
        ),
        new IsolationRule(makeDefinition({ id: RULE_ID.ISOLATION, priority: 20 })),
        new ComplianceRule(makeDefinition({ id: RULE_ID.COMPLIANCE, priority: 30 })),
        new PermissionRule(
          makeDefinition({ id: RULE_ID.PERMISSION, priority: 40 }),
          makeEvaluator(),
        ),
        new TemporalRule(makeDefinition({ id: RULE_ID.TEMPORAL, priority: 50 })),
      ],
    )
    const result = await pipeline.execute(makeRuleContext(), [
      makeNode({ id: 'a', organizationId: ORG_B, ...SURVIVOR }),
    ])
    expect(result.executedStages).toEqual([
      'global-injection',
      'isolation',
      'compliance',
      'permission',
      'temporal',
      'derivability',
    ])
    // The foreign node is removed by isolation — the FIRST rule — not by a later one.
    expect(result.explanations[0]?.failingRuleId).toBe('isolation')
  })

  it('skips disabled rules', async () => {
    const pipeline = new RulePipeline(
      new GlobalKnowledgeInjector({
        findGlobalNodes: async () => [],
      } as unknown as IGlobalKnowledgeProvider),
      [
        new IsolationRule(makeDefinition({ id: RULE_ID.ISOLATION, priority: 20, enabled: false })),
        new DerivabilityRule(
          makeDefinition({
            id: RULE_ID.DERIVABILITY,
            priority: 60,
            configuration: { defaultThreshold: 80 },
          }),
          new DeterministicDerivabilityEvaluator(),
        ),
      ],
    )
    const result = await pipeline.execute(makeRuleContext(), [
      makeNode({ id: 'a', organizationId: ORG_B, ...SURVIVOR }),
    ])
    // Isolation is disabled, so the foreign node survives to derivability.
    expect(result.executedStages).toEqual(['global-injection', 'derivability'])
    expect(result.candidates.map((n) => n.id)).toEqual(['a'])
  })

  it('deduplicates input nodes before any rule runs (first occurrence wins)', async () => {
    const pipeline = buildDefaultPipeline()
    const result = await pipeline.execute(makeRuleContext(), [
      makeNode({ id: 'dup', ...SURVIVOR }),
      makeNode({ id: 'dup', ...SURVIVOR }),
    ])
    expect(result.metrics.initialCount).toBe(1)
    expect(result.candidates).toHaveLength(1)
    expect(result.explanations).toHaveLength(1)
  })

  it('works on a single-node graph and an empty input', async () => {
    const pipeline = buildDefaultPipeline()
    const single = await pipeline.execute(makeRuleContext(), [
      makeNode({ id: 'only', ...SURVIVOR }),
    ])
    expect(single.candidates.map((n) => n.id)).toEqual(['only'])
    expect(single.metrics.countsAfterStage[0]?.count).toBe(1)

    const empty = await pipeline.execute(makeRuleContext(), [])
    expect(empty.candidates).toEqual([])
    expect(empty.metrics.finalCount).toBe(0)
  })
})
