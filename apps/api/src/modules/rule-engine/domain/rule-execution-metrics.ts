import type { RuleReasonCode } from './reason-codes'

/** Node count after one pipeline stage (injection or a rule). */
export interface RuleStageCount {
  readonly stageId: string
  readonly count: number
}

/**
 * Per-run pipeline metrics: the count after every stage plus aggregate
 * removal/duration statistics. Powers the UI's funnel visualization and the
 * per-rule performance benchmark.
 */
export interface RuleExecutionMetrics {
  /** Input node count after deduplication, before injection. */
  readonly initialCount: number
  /** Nodes added by global injection. */
  readonly injectedCount: number
  /** Nodes surviving every enabled rule. */
  readonly finalCount: number
  readonly totalDurationMs: number
  /** Ordered stage counts: global-injection first, then rules by priority. */
  readonly countsAfterStage: readonly RuleStageCount[]
  /** Nodes removed by each rule (keyed by rule id). */
  readonly removedByRule: Readonly<Record<string, number>>
  /** Nodes removed per reason code (machine-readable funnel). */
  readonly removedByReason: Readonly<Record<string, number>>
  /** Wall-clock duration of each rule (keyed by rule id). */
  readonly ruleDurationsMs: Readonly<Record<string, number>>
}

/** Convenience: every defined reason code keyed to a zero count. */
export const EMPTY_REASON_COUNTS: Readonly<Record<string, number>> = Object.fromEntries(
  [
    'ORG_MISMATCH',
    'MISSING_CLEARANCE',
    'INSUFFICIENT_PERMISSION',
    'EXPIRED_NODE',
    'SUPERSEDED_NODE',
    'FUTURE_EFFECTIVE_NODE',
    'NOT_ACTIVE',
    'DERIVABLE_CONTENT',
    'EXPLICIT_DISCARD',
  ].map((code) => [code, 0]),
)

export type { RuleReasonCode }
