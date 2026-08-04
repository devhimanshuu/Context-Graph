/**
 * Strongly typed pipeline configuration.
 *
 * These config interfaces are contracts for the values future feature
 * implementations consume. Loading them from validated environment /
 * tenant configuration is an implementation concern (Phase 4+); declaring
 * them here keeps the entire application layer type-safe without runtime
 * wiring.
 */
export interface PipelineConfig {
  /** Traversal depth used when the request does not specify one. */
  defaultMaxDepth: number
  /** Hard cap enforced by the pipeline regardless of the request. */
  maxDepthLimit: number
  defaultMaxCandidates: number
  maxCandidatesLimit: number
  /** Budget for a whole run; exceeded runs fail with PipelineError. */
  timeoutMs: number
}
