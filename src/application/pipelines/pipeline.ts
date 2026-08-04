import { type PipelineRequest, type PipelineResult } from '@/application/contracts/pipeline'
import { type PipelineStage } from './pipeline-stage'

/**
 * The pipeline orchestrator contract.
 *
 * Implementations execute the registered stages in order, build the
 * `PipelineContext`, collect per-stage metrics, and return a discriminated
 * `PipelineResult`. Application code (use cases, controllers) depends on this
 * interface — swapping the execution strategy (sequential, parallel-friendly,
 * async queue backed) requires no caller changes.
 */
export interface Pipeline {
  /** The ordered stages this pipeline executes. */
  readonly stages: readonly PipelineStage[]

  run(request: PipelineRequest): Promise<PipelineResult>
}
