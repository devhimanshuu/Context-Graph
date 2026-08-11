import type { EntityId, Timestamp } from '@contextgraph/types'
import type { RuleEngineConfig } from '../configuration/rule-engine.config'
import type { RuleCandidateNode } from './candidate-node'
import type { RuleEvaluationResult } from './rule-result'
import type { RuleExecutionMetrics } from './rule-execution-metrics'
import type { RuleReasonCode } from './reason-codes'

/**
 * Input of a single rule-engine run. The node set is the AUTHORIZED set:
 * graph-reachable nodes the permission engine already cleared. The engine
 * itself never traverses the graph and never performs I/O.
 */
export interface RuleEngineRequest {
  readonly workspaceId: EntityId
  readonly entryNodeIds: readonly EntityId[]
  /** The authorized candidate set (may include globally-injected nodes). */
  readonly nodes: readonly RuleCandidateNode[]
  /** Fixed evaluation instant (UTC). Defaults to now when omitted. */
  readonly evaluatedAt?: Timestamp
  /** Per-run configuration overrides, merged over the defaults. */
  readonly config?: Partial<RuleEngineConfig>
}

/** Full explainability record for one node: every rule verdict + the final outcome. */
export interface NodeRuleExplanation {
  readonly nodeId: EntityId
  readonly included: boolean
  /** Reason code of the rule that removed the node; null when included. */
  readonly finalReasonCode: RuleReasonCode | null
  /** Id of the rule that removed the node; null when included. */
  readonly failingRuleId: string | null
  /** Every rule evaluation for this node, in pipeline order. */
  readonly ruleResults: readonly RuleEvaluationResult[]
}

/** Output of a single rule-engine run. */
export interface RuleEngineResponse {
  readonly requestId: string
  readonly entryNodeIds: readonly EntityId[]
  /** Final candidate set (subset of input + injected globals, deduplicated). */
  readonly candidates: readonly RuleCandidateNode[]
  /** Per-node explanations, in deterministic (input) order. */
  readonly explanations: readonly NodeRuleExplanation[]
  readonly metrics: RuleExecutionMetrics
  /** Executed stage ids in order — the machine-readable rule trace. */
  readonly executedStages: readonly string[]
}
