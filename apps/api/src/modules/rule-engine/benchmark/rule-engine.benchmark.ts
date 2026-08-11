/**
 * Rule engine benchmark.
 *
 * Proves the engine's performance property: rules are pure in-memory passes
 * over the node set (O(V × R) evaluations, zero database access), so tens of
 * thousands of authorized nodes are filtered in milliseconds.
 *
 * Run: npm run bench:rules (from apps/api)
 */
import { NodeStatus, NodeType, ComplianceTag } from '@contextgraph/types'
import {
  GlobalKnowledgeInjector,
  NoopGlobalKnowledgeProvider,
} from '../injectors/global-knowledge.injector'
import { IsolationRule } from '../rules/isolation.rule'
import { ComplianceRule } from '../rules/compliance.rule'
import { PermissionRule } from '../rules/permission.rule'
import { TemporalRule } from '../rules/temporal.rule'
import { DerivabilityRule } from '../rules/derivability.rule'
import { DeterministicDerivabilityEvaluator } from '../evaluators/derivability.evaluator'
import { makeEvaluator, makeNode, makeRuleContext } from '../testing/rule-engine-fixtures'
import { RulePipeline } from '../pipeline/rule-pipeline'
import { makeDefinition } from '../testing/rule-engine-fixtures'
import { RULE_ID } from '../configuration/rule-ids'
import type { RuleCandidateNode } from '../domain/candidate-node'

interface BenchmarkRow {
  nodes: number
  totalMs: number
  perRuleMs: Readonly<Record<string, number>>
  removed: number
}

const SIZES = [100, 1_000, 10_000, 100_000] as const

/** ~20% of nodes fail each stage so the funnel is representative, not empty. */
function makeNodes(count: number): RuleCandidateNode[] {
  return Array.from({ length: count }, (_, index) => {
    const bucket = index % 5
    switch (bucket) {
      case 0:
        return makeNode({ id: `n-${index}`, organizationId: 'org-other' })
      case 1:
        return makeNode({ id: `n-${index}`, complianceTags: [ComplianceTag.RESTRICTED] })
      case 2:
        return makeNode({ id: `n-${index}`, status: NodeStatus.EXPIRED })
      case 3:
        return makeNode({ id: `n-${index}`, type: NodeType.CONSTRAINT, derivabilityScore: 90 })
      default:
        return makeNode({ id: `n-${index}`, type: NodeType.CONSTRAINT, derivabilityScore: 30 })
    }
  })
}

function buildPipeline(): RulePipeline {
  const evaluator = makeEvaluator()
  return new RulePipeline(new GlobalKnowledgeInjector(new NoopGlobalKnowledgeProvider()), [
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
  ])
}

async function run(): Promise<void> {
  const pipeline = buildPipeline()
  const context = makeRuleContext()
  const rows: BenchmarkRow[] = []

  for (const size of SIZES) {
    const nodes = makeNodes(size)
    const startedAt = performance.now()
    const result = await pipeline.execute(context, nodes)
    const totalMs = performance.now() - startedAt
    const row = {
      nodes: size,
      totalMs: Number(totalMs.toFixed(2)),
      perRuleMs: Object.fromEntries(
        Object.entries(result.metrics.ruleDurationsMs).map(([ruleId, ms]) => [
          ruleId,
          Number(ms.toFixed(2)),
        ]),
      ),
      removed: size - result.metrics.finalCount,
    }
    rows.push(row)
    process.stdout.write(
      `nodes=${size} removed=${row.removed} final=${result.metrics.finalCount} total=${totalMs.toFixed(2)}ms ${formatPerRule(row.perRuleMs)}\n`,
    )
  }

  const largest = rows[rows.length - 1]
  if (largest !== undefined) {
    process.stdout.write(
      `\nsummary: ${largest.nodes.toLocaleString('en-US')} nodes in ${largest.totalMs}ms ` +
        `(~${Math.round((largest.nodes / Math.max(largest.totalMs, 0.001)) * 1000).toLocaleString('en-US')} nodes/s, ` +
        `5 rule passes, zero database access)\n`,
    )
  }
}

function formatPerRule(perRuleMs: Readonly<Record<string, number>>): string {
  return Object.entries(perRuleMs)
    .map(([ruleId, ms]) => `${ruleId}=${ms}ms`)
    .join(' ')
}

void run()
