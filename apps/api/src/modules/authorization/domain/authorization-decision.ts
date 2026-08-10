/** Outcome of a single policy evaluation. */
export const PolicyOutcome = {
  ALLOW: 'ALLOW',
  DENY: 'DENY',
  /** Policy is not applicable to this context/resource pair. */
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const
export type PolicyOutcome = (typeof PolicyOutcome)[keyof typeof PolicyOutcome]

/** Result of one policy in the pipeline. */
export interface PolicyVerdict {
  readonly policy: string
  readonly outcome: PolicyOutcome
  readonly reason?: string
}

/**
 * The engine's answer. Never a bare boolean: carries the failing policy and the
 * full evaluated list so callers (guards, audit, pipeline explanations, admin
 * dashboards) can explain and investigate a denial deterministically.
 */
export interface AuthorizationDecision {
  readonly allowed: boolean
  /** Human-readable explanation of the outcome. */
  readonly reason: string
  /** Name of the policy that denied, or null when allowed / not applicable. */
  readonly failedPolicy: string | null
  /** Every policy evaluated, in pipeline order. */
  readonly evaluatedPolicies: readonly string[]
  readonly verdicts: readonly PolicyVerdict[]
  readonly metadata?: Readonly<Record<string, unknown>>
}
