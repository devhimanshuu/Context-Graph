import type { RuleDefinition } from '../domain/rule-definition'
import { RULE_ID } from './rule-ids'

/**
 * Strongly typed rule-engine configuration.
 *
 * The pipeline is assembled from these definitions: order is explicit via
 * `priority` (documented below), rules can be disabled, and per-rule
 * `configuration` carries tunables (derivability threshold, temporal
 * semantics). Future phases replace the static default with per-organization
 * persisted configuration — the pipeline contract does not change.
 */
export interface RuleEngineConfig {
  /** Ordered rule definitions (priority ascending; ties broken by id). */
  readonly rules: readonly RuleDefinition[]
  /** Safety bound: reject runs whose input set exceeds this size. */
  readonly maxNodes: number
}

/**
 * The default (safe) pipeline. Order rationale:
 *
 *   global-injection (stage 0, always first) — merge organization-wide policy
 *   isolation      (20) — cheapest and most critical: drop foreign-tenant nodes
 *   compliance     (30) — clearance gates before any capability check
 *   permission     (40) — re-verify READ through the authorization engine
 *   temporal       (50) — drop invalid/expired/superseded knowledge
 *   derivability   (60) — drop generic content last, after everything valid
 *
 * A rule added later must pick an explicit priority — never rely on file or
 * array order.
 */
export const DEFAULT_RULE_DEFINITIONS: readonly RuleDefinition[] = [
  {
    id: RULE_ID.ISOLATION,
    name: 'Organization isolation',
    description:
      'Defense-in-depth tenant boundary: nodes of another organization never enter the candidate set.',
    enabled: true,
    priority: 20,
    configuration: {},
  },
  {
    id: RULE_ID.COMPLIANCE,
    name: 'Compliance clearance',
    description:
      'Every node compliance tag must be covered by the principal\u2019s effective clearance tags.',
    enabled: true,
    priority: 30,
    configuration: {},
  },
  {
    id: RULE_ID.PERMISSION,
    name: 'Permission authorization',
    description:
      'Re-verifies READ through the authorization engine (also covers globally injected nodes).',
    enabled: true,
    priority: 40,
    configuration: {},
  },
  {
    id: RULE_ID.TEMPORAL,
    name: 'Temporal validity',
    description: 'Drops nodes outside their validity window or in a non-valid lifecycle status.',
    enabled: true,
    priority: 50,
    configuration: { legalHoldOverridesExpiry: true },
  },
  {
    id: RULE_ID.DERIVABILITY,
    name: 'Derivability filter',
    description:
      'Drops generic content a foundation model could derive itself; preserves organization-specific knowledge.',
    enabled: true,
    priority: 60,
    configuration: { defaultThreshold: 80 },
  },
]

export const DEFAULT_RULE_ENGINE_CONFIG: RuleEngineConfig = {
  rules: DEFAULT_RULE_DEFINITIONS,
  maxNodes: 100_000,
}

/**
 * Merges per-run overrides over the defaults. Rule lists are replaced whole
 * (a caller overriding the pipeline supplies the full ordered list), which
 * keeps ordering explicit and unambiguous.
 */
export function mergeRuleEngineConfig(
  defaults: RuleEngineConfig,
  overrides?: Partial<RuleEngineConfig>,
): RuleEngineConfig {
  if (overrides === undefined) return defaults
  return {
    rules: overrides.rules ?? defaults.rules,
    maxNodes: overrides.maxNodes ?? defaults.maxNodes,
  }
}

/** Deterministic rule ordering: priority ascending, then id ascending. */
export function compareRuleDefinitions(a: RuleDefinition, b: RuleDefinition): number {
  if (a.priority !== b.priority) return a.priority - b.priority
  if (a.id < b.id) return -1
  if (a.id > b.id) return 1
  return 0
}
