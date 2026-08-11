/** Stable rule ids — part of the API contract (metrics, explanations, audit). */
export const RULE_ID = {
  GLOBAL_INJECTION: 'global-injection',
  ISOLATION: 'isolation',
  COMPLIANCE: 'compliance',
  PERMISSION: 'permission',
  TEMPORAL: 'temporal',
  DERIVABILITY: 'derivability',
} as const
export type RuleId = (typeof RULE_ID)[keyof typeof RULE_ID]

/** Metadata keys the engine reads on candidate nodes. */
export const RULE_METADATA_KEY = {
  /** `keep: true|false` — explicit derivability override. */
  KEEP: 'keep',
  /** `isGlobal: true` — node is organization-wide policy (kept with its input reason). */
  IS_GLOBAL: 'isGlobal',
} as const
