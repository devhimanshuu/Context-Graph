/** Why a node entered the rule engine's candidate set. Stable vocabulary used by explanations and the UI. */
export const InclusionReason = {
  /** Reached from the entry node by graph traversal. */
  LOCAL_REACHABILITY: 'LOCAL_REACHABILITY',
  /** Injected because it is globally relevant (organization-wide policy). */
  GLOBAL_POLICY: 'GLOBAL_POLICY',
  /** Explicitly requested by the caller (reserved for future context assembly). */
  EXPLICIT_CONTEXT: 'EXPLICIT_CONTEXT',
} as const
export type InclusionReason = (typeof InclusionReason)[keyof typeof InclusionReason]
