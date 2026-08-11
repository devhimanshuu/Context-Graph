import type { InclusionReason } from '../../rule-engine/domain/inclusion-reason'

/**
 * How the context assembler should treat a candidate's content. Compression
 * is NOT implemented here — these are deterministic hints for the future
 * formatter/LLM adapter layer.
 */
export const CompressionHint = {
  /** Include the full content verbatim. */
  FULL: 'FULL',
  /** Include a brief summary (future: deterministic extractive summary). */
  SUMMARY: 'SUMMARY',
  /** Include a compressed/truncated form of the content. */
  COMPRESSED: 'COMPRESSED',
  /** Include only the reference (title + id); content stays out of context. */
  REFERENCE_ONLY: 'REFERENCE_ONLY',
} as const
export type CompressionHint = (typeof CompressionHint)[keyof typeof CompressionHint]

export interface CompressionHintInput {
  readonly distance: number
  readonly derivabilityScore: number | null
  readonly importance: number
  readonly inclusionReason: InclusionReason
}

/** Generic content is never worth full tokens — a bare reference suffices. */
const REFERENCE_ONLY_DERIVABILITY_THRESHOLD = 80
/** Beyond this depth the node is context-far: compress, do not expand. */
const COMPRESSED_DISTANCE_THRESHOLD = 3
/** Important nearby knowledge earns a summary instead of compression. */
const SUMMARY_IMPORTANCE_THRESHOLD = 70

/**
 * Derives the deterministic compression hint for a candidate.
 *
 * Priority order (documented, stable):
 *   1. the entry node anchors the package -> FULL;
 *   2. explicitly requested nodes are always fully expanded -> FULL;
 *   3. highly derivable (generic) content -> REFERENCE_ONLY;
 *   4. context-far nodes (distance >= 3) -> COMPRESSED;
 *   5. high-importance nearby nodes -> SUMMARY;
 *   6. otherwise -> COMPRESSED.
 */
export function deriveCompressionHint(input: CompressionHintInput): CompressionHint {
  if (input.distance === 0 || input.inclusionReason === 'EXPLICIT_CONTEXT') {
    return CompressionHint.FULL
  }
  if (
    input.derivabilityScore !== null &&
    input.derivabilityScore >= REFERENCE_ONLY_DERIVABILITY_THRESHOLD
  ) {
    return CompressionHint.REFERENCE_ONLY
  }
  if (input.distance >= COMPRESSED_DISTANCE_THRESHOLD) {
    return CompressionHint.COMPRESSED
  }
  if (input.importance >= SUMMARY_IMPORTANCE_THRESHOLD) {
    return CompressionHint.SUMMARY
  }
  return CompressionHint.COMPRESSED
}
