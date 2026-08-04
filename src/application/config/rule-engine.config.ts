/**
 * Strongly typed rule-engine configuration.
 */
export interface RuleEngineConfig {
  enabled: boolean
  /** Per-rule evaluation budget; exceeded rules fail with RuleEngineError. */
  evaluationTimeoutMs: number
  /** Cap on rules evaluated per request. */
  maxRulesPerEvaluation: number
  /** Rules below this priority are skipped. */
  defaultPriorityFloor: number
}
