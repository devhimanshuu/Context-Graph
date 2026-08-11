import type { RuleReasonCode } from './reason-codes'

/**
 * Outcome of one rule for one node. Never a bare boolean: the stable
 * `reasonCode` feeds the UI's "why?" surfaces, audit trails and analytics,
 * while `reason` is the human-readable explanation.
 */
export interface RuleEvaluationResult {
  readonly ruleId: string
  readonly nodeId: string
  readonly passed: boolean
  readonly reason: string
  readonly reasonCode: RuleReasonCode
  /** Fixed evaluation instant (UTC) — determinism: rules never read the clock. */
  readonly evaluatedAt: string
  /** Extra diagnostics, e.g. missing tags or the failing authorization policy. */
  readonly metadata?: Readonly<Record<string, unknown>>
}
