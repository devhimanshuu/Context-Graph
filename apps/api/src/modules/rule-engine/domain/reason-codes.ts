/**
 * Stable, machine-readable reason codes emitted by rule evaluations. These are
 * part of the API contract (powering the "why was this included/excluded?"
 * UI, audit trails and analytics), so they must never change meaning — new
 * rules add new codes rather than reusing existing ones.
 */
export const RuleReasonCode = {
  /** The node satisfied the rule. */
  PASS: 'PASS',
  /** The rule is not applicable to this node (e.g. no tags to check). */
  NOT_APPLICABLE: 'NOT_APPLICABLE',

  // Failures (removal reasons)
  /** Node belongs to another organization (defense-in-depth isolation). */
  ORG_MISMATCH: 'ORG_MISMATCH',
  /** Node requires compliance tags the principal lacks. */
  MISSING_CLEARANCE: 'MISSING_CLEARANCE',
  /** The authorization engine denied READ access. */
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
  /** Node validity window has closed or its status is EXPIRED. */
  EXPIRED_NODE: 'EXPIRED_NODE',
  /** A newer version of this knowledge has superseded the node. */
  SUPERSEDED_NODE: 'SUPERSEDED_NODE',
  /** Node is not yet valid (validFrom lies in the future). */
  FUTURE_EFFECTIVE_NODE: 'FUTURE_EFFECTIVE_NODE',
  /** Node status is DRAFT/ARCHIVED — not published knowledge. */
  NOT_ACTIVE: 'NOT_ACTIVE',
  /** Content is derivable (generic) and should be dropped from context. */
  DERIVABLE_CONTENT: 'DERIVABLE_CONTENT',
  /** Node explicitly flagged to be discarded via metadata. */
  EXPLICIT_DISCARD: 'EXPLICIT_DISCARD',
} as const
export type RuleReasonCode = (typeof RuleReasonCode)[keyof typeof RuleReasonCode]
