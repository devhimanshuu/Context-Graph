/**
 * Timing and cardinality metrics collected across a pipeline run.
 *
 * This is the canonical metrics shape — `PipelineMetrics` in the pipeline
 * contracts is an alias of this type so the vocabulary cannot drift.
 * `stageDurationsMs` is keyed by stage kind (see `PipelineStageKind`).
 */
export interface MetricsContextDto {
  startedAt: Date
  finishedAt: Date | null
  durationMs: number | null
  nodesVisited: number
  nodesFiltered: number
  candidatesProduced: number
  stagesCompleted: number
  stageDurationsMs: Record<string, number>
}
