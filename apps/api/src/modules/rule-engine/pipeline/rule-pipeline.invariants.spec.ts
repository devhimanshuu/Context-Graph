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

function buildPipeline(globalNodes: readonly RuleCandidateNode[] = []): RulePipeline {
  const injector = new GlobalKnowledgeInjector({
    findGlobalNodes: vi.fn(async () => globalNodes),
  } as unknown as IGlobalKnowledgeProvider)
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

const SURVIVOR = { type: NodeType.CONSTRAINT, derivabilityScore: 30 } as const

describe('RulePipeline invariants', () => {
  it('1 — a node denied by an early rule never becomes a candidate', async () => {
    const result = await buildPipeline().execute(makeRuleContext(), [
      makeNode({ id: 'foreign', organizationId: ORG_B, ...SURVIVOR }),
      makeNode({ id: 'ok', ...SURVIVOR }),
    ])
    expect(result.candidates.map((n) => n.id)).toEqual(['ok'])
    expect(result.explanations.find((e) => e.nodeId === 'foreign')?.included).toBe(false)
  })

  it('2 — a node removed by a rule cannot reappear (derivability gate)', async () => {
    const result = await buildPipeline().execute(makeRuleContext(), [
      makeNode({ id: 'generic', type: NodeType.CONSTRAINT, derivabilityScore: 90 }),
    ])
    expect(result.candidates).toEqual([])
    expect(result.explanations[0]).toMatchObject({ included: false, failingRuleId: 'derivability' })
  })

  it('3 — duplicate node ids never exist in the final candidate set', async () => {
    const result = await buildPipeline().execute(makeRuleContext(), [
      makeNode({ id: 'a', ...SURVIVOR }),
      makeNode({ id: 'a', ...SURVIVOR }),
      makeNode({ id: 'b', ...SURVIVOR }),
    ])
    const ids = result.candidates.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('4 — rule ordering is deterministic across runs', async () => {
    const pipeline = buildPipeline()
    const context = makeRuleContext()
    const input = [makeNode({ id: 'a', ...SURVIVOR })]
    const first = await pipeline.execute(context, input)
    const second = await pipeline.execute(context, input)
    expect(second.executedStages).toEqual(first.executedStages)
    expect(second.metrics.countsAfterStage.map((s) => s.stageId)).toEqual(
      first.metrics.countsAfterStage.map((s) => s.stageId),
    )
  })

  it('5 — global nodes are not duplicated when they overlap the input', async () => {
    const global = makeNode({
      id: 'shared',
      ...SURVIVOR,
      inclusionReason: InclusionReason.GLOBAL_POLICY,
    })
    const result = await buildPipeline([global]).execute(makeRuleContext(), [
      makeNode({ id: 'shared', ...SURVIVOR }),
    ])
    expect(result.candidates.map((n) => n.id)).toEqual(['shared'])
    expect(result.candidates).toHaveLength(1)
    expect(result.metrics.injectedCount).toBe(0)
  })

  it('6a — final candidates are a subset of the authorized input (plus injected globals)', async () => {
    const global = makeNode({
      id: 'global-1',
      ...SURVIVOR,
      inclusionReason: InclusionReason.GLOBAL_POLICY,
    })
    const result = await buildPipeline([global]).execute(makeRuleContext(), [
      makeNode({ id: 'in', ...SURVIVOR }),
      makeNode({ id: 'foreign', organizationId: ORG_B, ...SURVIVOR }),
    ])
    const inputIds = new Set(['in', 'global-1'])
    for (const candidate of result.candidates) {
      expect(inputIds.has(candidate.id)).toBe(true)
    }
  })

  it('6b — injected global nodes must satisfy their own authorization requirements', async () => {
    // A global node the principal may not read (restricted tag / foreign dept) is removed.
    const restrictedGlobal = makeNode({
      id: 'g-restricted',
      complianceTags: [ComplianceTag.RESTRICTED],
      inclusionReason: InclusionReason.GLOBAL_POLICY,
    })
    const foreignDeptGlobal = makeNode({
      id: 'g-foreign-dept',
      departmentId: DEPT_FINANCE,
      inclusionReason: InclusionReason.GLOBAL_POLICY,
    })
    const result = await buildPipeline([restrictedGlobal, foreignDeptGlobal]).execute(
      makeRuleContext(),
      [makeNode({ id: 'in', ...SURVIVOR })],
    )
    expect(result.candidates.map((n) => n.id)).toEqual(['in'])
  })

  it('7 — every excluded node has an explainable reason', async () => {
    const result = await buildPipeline().execute(makeRuleContext(), [
      makeNode({ id: 'a', organizationId: ORG_B, ...SURVIVOR }),
      makeNode({ id: 'b', complianceTags: [ComplianceTag.RESTRICTED], ...SURVIVOR }),
      makeNode({ id: 'c', departmentId: DEPT_FINANCE, ...SURVIVOR }),
      makeNode({ id: 'd', status: NodeStatus.EXPIRED, ...SURVIVOR }),
      makeNode({ id: 'e', type: NodeType.CONSTRAINT, derivabilityScore: 95 }),
      makeNode({ id: 'ok', ...SURVIVOR }),
    ])
    const excluded = result.explanations.filter((e) => !e.included)
    expect(excluded).toHaveLength(5)
    for (const explanation of excluded) {
      expect(explanation.finalReasonCode).not.toBeNull()
      expect(explanation.failingRuleId).not.toBeNull()
      const failing = explanation.ruleResults.find((r) => !r.passed)
      expect(failing?.reasonCode).toBe(explanation.finalReasonCode)
      expect(failing?.ruleId).toBe(explanation.failingRuleId)
    }
  })

  it('8 — identical user/graph/config/timestamp yields a byte-identical outcome', async () => {
    const pipeline = buildPipeline()
    const context = makeRuleContext({ evaluatedAt: '2026-06-15T12:00:00.000Z' })
    const input = [
      makeNode({ id: 'a', ...SURVIVOR }),
      makeNode({ id: 'b', organizationId: ORG_B }),
      makeNode({ id: 'c', status: NodeStatus.SUPERSEDED }),
    ]
    const first = await pipeline.execute(context, input)
    const second = await pipeline.execute(context, input)
    // Wall-clock durations are deliberately excluded — determinism covers the
    // decision set, ordering and explanations, not timing.
    expect(normalize(second)).toBe(normalize(first))
  })
})

/** Drops run timing so determinism can be asserted without wall-clock noise. */
function normalize(result: Awaited<ReturnType<RulePipeline['execute']>>): string {
  const copy = structuredClone(result)
  delete copy.metrics.totalDurationMs
  delete copy.metrics.ruleDurationsMs
  return JSON.stringify(copy)
}
