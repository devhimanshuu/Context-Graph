import {
  type PipelineContext,
  type PipelineStageKind,
  type PipelineStageResult,
} from '@/application/contracts/pipeline'

/**
 * The common contract every pipeline stage implements.
 *
 * Replaceability: the pipeline orchestrator depends only on this interface,
 * so stages can be reordered, swapped, or removed without touching the
 * orchestrator or other stages. A stage:
 * - reads prior state from `context`,
 * - performs one focused transformation (filter, enrich, resolve, ...),
 * - accumulates its output into `context` (e.g. `visitedNodes`, metrics),
 * - returns a `PipelineStageResult` describing its own execution.
 *
 * Future stages are plugged in by adding them to the stage registry
 * (`stages.ts`) — no existing code changes.
 */
export interface PipelineStage {
  readonly kind: PipelineStageKind
  execute(context: PipelineContext): Promise<PipelineStageResult>
}
