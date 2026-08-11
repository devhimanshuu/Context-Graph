/**
 * A configurable rule definition. Rules are identified by stable ids, ordered
 * by explicit priority (not array position), and may be disabled or tuned via
 * configuration — today from the default config, later from per-organization
 * persisted configuration.
 */
export interface RuleDefinition {
  /** Stable identifier (part of the API contract). */
  readonly id: string
  readonly name: string
  readonly description: string
  /** Disabled rules are skipped by the pipeline. */
  readonly enabled: boolean
  /** Explicit ordering — lower priority executes first. Priority + id is the sort key. */
  readonly priority: number
  /** Rule-specific configuration (e.g. derivability threshold). */
  readonly configuration: Readonly<Record<string, unknown>>
}
