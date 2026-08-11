import { NodeType } from '@contextgraph/types'
import type { RuleCandidateNode } from '../domain/candidate-node'
import { RULE_METADATA_KEY } from '../configuration/rule-ids'

/** Why a node was classified as derivable or organization-specific. */
export const DerivabilityReason = {
  /** metadata.keep === true → always preserve. */
  EXPLICIT_KEEP: 'EXPLICIT_KEEP',
  /** metadata.keep === false → always discard. */
  EXPLICIT_DISCARD: 'EXPLICIT_DISCARD',
  /** derivabilityScore at/above the threshold → generic. */
  SCORE_ABOVE_THRESHOLD: 'SCORE_ABOVE_THRESHOLD',
  /** derivabilityScore below the threshold → organization-specific. */
  SCORE_BELOW_THRESHOLD: 'SCORE_BELOW_THRESHOLD',
  /** No score: bare FACTs are assumed generic; other types are preserved. */
  TYPE_BASED: 'TYPE_BASED',
} as const
export type DerivabilityReason = (typeof DerivabilityReason)[keyof typeof DerivabilityReason]

/** Deterministic outcome of a derivability evaluation. */
export interface DerivabilityDecision {
  /** True = drop the node from context (a foundation model could derive it). */
  readonly derivable: boolean
  readonly reason: DerivabilityReason
  /** The score used (null when type-based). */
  readonly score: number | null
}

/**
 * Derivability evaluation contract. Swappable via DI: today only the
 * deterministic strategy is bound; future strategies (metadata embeddings,
 * LLM-assisted, org-specific models) implement the same contract and the rule
 * does not change.
 */
export abstract class IDerivabilityEvaluator {
  abstract evaluate(
    node: RuleCandidateNode,
    config: Readonly<Record<string, unknown>>,
  ): DerivabilityDecision
}

/**
 * Fully deterministic strategy — no LLM, no randomness.
 *
 *  1. metadata.keep overrides everything (EXPLICIT_KEEP / EXPLICIT_DISCARD).
 *  2. derivabilityScore (0-100, higher = more generic): score >= threshold is
 *     derivable. Threshold defaults to 80 (`defaultThreshold`).
 *  3. No score: node-type heuristic — FACTs are assumed generic
 *     (organization-agnostic facts), CONSTRAINT/DECISION/ANTI_PATTERN are
 *     organization-specific policy and preserved.
 */
export class DeterministicDerivabilityEvaluator extends IDerivabilityEvaluator {
  evaluate(
    node: RuleCandidateNode,
    config: Readonly<Record<string, unknown>>,
  ): DerivabilityDecision {
    const keep = node.metadata[RULE_METADATA_KEY.KEEP]
    if (keep === true)
      return {
        derivable: false,
        reason: DerivabilityReason.EXPLICIT_KEEP,
        score: node.derivabilityScore,
      }
    if (keep === false)
      return {
        derivable: true,
        reason: DerivabilityReason.EXPLICIT_DISCARD,
        score: node.derivabilityScore,
      }

    if (node.derivabilityScore !== null) {
      const threshold = readThreshold(config)
      const derivable = node.derivabilityScore >= threshold
      return {
        derivable,
        reason: derivable
          ? DerivabilityReason.SCORE_ABOVE_THRESHOLD
          : DerivabilityReason.SCORE_BELOW_THRESHOLD,
        score: node.derivabilityScore,
      }
    }

    const typeBasedDerivable = node.type === NodeType.FACT
    return {
      derivable: typeBasedDerivable,
      reason: DerivabilityReason.TYPE_BASED,
      score: null,
    }
  }
}

/** Reads `defaultThreshold` (clamped 0-100, default 80) from the rule config. */
function readThreshold(config: Readonly<Record<string, unknown>>): number {
  const raw = config['defaultThreshold']
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 80
  return Math.min(100, Math.max(0, raw))
}
