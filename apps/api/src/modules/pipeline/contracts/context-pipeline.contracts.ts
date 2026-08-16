import type {
  ComplianceTag,
  EntityId,
  NodeStatus,
  NodeType,
  Score,
  Timestamp,
} from '@contextgraph/types'
import type { CompressionHint } from '../../candidate/domain/compression-hint'
import type { InclusionReason } from '../../rule-engine/domain/inclusion-reason'
import type { RuleReasonCode } from '../../rule-engine/domain/reason-codes'

/** Version of the pipeline semantics. Bumped when ranking/rules/stages change. */
export const PIPELINE_VERSION = 'contextgraph-v1'

/** Execution modes. DEBUG/AUDIT return every stage result and rule trace. */
export const PipelineMode = {
  /** Minimal consumer surface: package, summary, trace, exclusion reasons. */
  STANDARD: 'STANDARD',
  /** Full observability: every stage result + per-rule evaluation traces. */
  DEBUG: 'DEBUG',
  /** DEBUG surface + audit events recorded for the run. */
  AUDIT: 'AUDIT',
  /** DEBUG surface; run recorded in the pipeline metrics. */
  BENCHMARK: 'BENCHMARK',
} as const
export type PipelineMode = (typeof PipelineMode)[keyof typeof PipelineMode]

/** Every stage the orchestrator can execute, in execution order. */
export const PIPELINE_STAGE_ID = {
  VALIDATION: 'request-validation',
  AUTHORIZATION: 'authorization',
  ENTRY_RESOLUTION: 'entry-resolution',
  GRAPH_TRAVERSAL: 'graph-traversal',
  CANDIDATE_MAPPING: 'candidate-mapping',
  RULE_ENGINE: 'rule-engine',
  CANDIDATE_BUILD: 'candidate-build',
  CANDIDATE_RANKING: 'candidate-ranking',
  CONTEXT_BUDGET: 'context-budget',
  CONTEXT_PACKAGE: 'context-package',
} as const
export type PipelineStageId = (typeof PIPELINE_STAGE_ID)[keyof typeof PIPELINE_STAGE_ID]

export const DEFAULT_PIPELINE_STAGES: readonly PipelineStageId[] = [
  PIPELINE_STAGE_ID.VALIDATION,
  PIPELINE_STAGE_ID.AUTHORIZATION,
  PIPELINE_STAGE_ID.ENTRY_RESOLUTION,
  PIPELINE_STAGE_ID.GRAPH_TRAVERSAL,
  PIPELINE_STAGE_ID.CANDIDATE_MAPPING,
  PIPELINE_STAGE_ID.RULE_ENGINE,
  PIPELINE_STAGE_ID.CANDIDATE_BUILD,
  PIPELINE_STAGE_ID.CANDIDATE_RANKING,
  PIPELINE_STAGE_ID.CONTEXT_BUDGET,
  PIPELINE_STAGE_ID.CONTEXT_PACKAGE,
]

export type PipelineStageStatus = 'completed' | 'failed'

/** Structured execution metadata for one stage. */
export interface PipelineStageResult {
  readonly stageId: string
  readonly stageName: string
  readonly status: PipelineStageStatus
  readonly startedAt: Timestamp
  readonly completedAt: Timestamp
  readonly durationMs: number
  readonly inputCount: number | null
  readonly outputCount: number | null
  readonly metadata: Readonly<Record<string, unknown>>
}

/** Machine-readable execution trace entry (drives the pipeline visualization). */
export interface PipelineTraceEntry {
  readonly stageId: string
  readonly stageName: string
  readonly status: PipelineStageStatus
  readonly outputCount: number | null
  readonly durationMs: number
}

/** Aggregate pipeline counters and timings. */
export interface PipelineRunMetrics {
  readonly totalDurationMs: number
  readonly stagesExecuted: number
  /** Nodes returned by graph traversal (permission-filtered). */
  readonly reachableNodes: number
  /** Nodes handed to the rule engine (reachable + injected globals). */
  readonly authorizedNodes: number
  /** Globally-injected nodes (from the rule engine's stage 0). */
  readonly injectedNodes: number
  /** Candidates surviving every rule. */
  readonly ruleCandidates: number
  /** Candidates built (after dedup). */
  readonly builtCandidates: number
  /** Candidates after ranking + the maxCandidates ceiling. */
  readonly rankedCandidates: number
  /** Candidates that fit the context budget. */
  readonly includedCandidates: number
  readonly excludedByRules: number
  readonly excludedByBudget: number
  /** Candidates cut by the maxCandidates ceiling before the budget ran. */
  readonly excludedByRank: number
  readonly ruleEngineDurationMs: number
  readonly stageDurationsMs: Readonly<Record<string, number>>
}

/** The compact execution summary returned in every mode. */
export interface PipelineExecutionSummary {
  readonly requestId: string
  readonly packageId: string
  readonly version: string
  readonly mode: PipelineMode
  readonly evaluatedAt: Timestamp
  readonly funnel: {
    readonly reachable: number
    readonly authorized: number
    readonly ruleCandidates: number
    readonly included: number
  }
  readonly metrics: PipelineRunMetrics
  readonly trace: readonly PipelineTraceEntry[]
  /** Per-stage results — DEBUG/AUDIT/BENCHMARK modes only. */
  readonly stageResults?: readonly PipelineStageResult[]
}

/** One candidate selected into the final context package. */
export interface ContextPackageCandidate {
  readonly candidateId: EntityId
  readonly title: string
  readonly content: string
  readonly type: NodeType
  readonly status: NodeStatus
  readonly importance: Score
  readonly distance: number
  readonly derivabilityScore: Score | null
  readonly complianceTags: readonly ComplianceTag[]
  readonly inclusionReason: InclusionReason
  readonly compressionHint: CompressionHint
  readonly score: number
  readonly rank: number
  readonly tokens: number
}

/** One rule-verdict in a debug/audit explanation trace. */
export interface PipelineRuleVerdict {
  readonly ruleId: string
  readonly passed: boolean
  readonly reasonCode: RuleReasonCode
  readonly reason: string
}

/** Why a node is absent from the package (rules, budget, or both). */
export interface CandidateExclusion {
  readonly nodeId: EntityId
  /** False: removed by a rule. */
  readonly included: boolean
  readonly finalReasonCode: RuleReasonCode | null
  readonly failingRuleId: string | null
  /** True: passed the rules but did not fit the context budget. */
  readonly excludedByBudget: boolean
  /** True: passed the rules but was cut by the maxCandidates ceiling. */
  readonly excludedByRank?: boolean
  /** Per-rule traces — DEBUG/AUDIT modes only. */
  readonly ruleResults?: readonly PipelineRuleVerdict[]
}

/** The final, explainable, ranked, bounded context package. */
export interface ContextPackage {
  readonly packageId: string
  readonly requestId: string
  readonly version: string
  readonly mode: PipelineMode
  readonly workspaceId: EntityId
  readonly entryNodeId: EntityId
  readonly strategy: string
  readonly evaluatedAt: Timestamp
  readonly generatedAt: Timestamp
  readonly tokenBudget: number
  readonly tokensUsed: number
  readonly truncated: boolean
  readonly candidates: readonly ContextPackageCandidate[]
  readonly exclusions: readonly CandidateExclusion[]
  readonly summary: PipelineExecutionSummary
}

/** Human-readable stage names for traces. */
export const PIPELINE_STAGE_NAME: Readonly<Record<string, string>> = {
  [PIPELINE_STAGE_ID.VALIDATION]: 'Request validation',
  [PIPELINE_STAGE_ID.AUTHORIZATION]: 'Authorization',
  [PIPELINE_STAGE_ID.ENTRY_RESOLUTION]: 'Entry resolution',
  [PIPELINE_STAGE_ID.GRAPH_TRAVERSAL]: 'Graph traversal',
  [PIPELINE_STAGE_ID.CANDIDATE_MAPPING]: 'Candidate mapping',
  [PIPELINE_STAGE_ID.RULE_ENGINE]: 'Rule engine',
  [PIPELINE_STAGE_ID.CANDIDATE_BUILD]: 'Candidate build',
  [PIPELINE_STAGE_ID.CANDIDATE_RANKING]: 'Candidate ranking',
  [PIPELINE_STAGE_ID.CONTEXT_BUDGET]: 'Context budget',
  [PIPELINE_STAGE_ID.CONTEXT_PACKAGE]: 'Context package',
}
