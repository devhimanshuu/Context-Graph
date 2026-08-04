/**
 * Pipeline machinery — import from `@/application/pipelines`.
 */
export type { PipelineStage } from './pipeline-stage'
export type { Pipeline } from './pipeline'
export {
  PIPELINE_STAGE_KINDS,
  PIPELINE_STAGE_DEFINITIONS,
  PIPELINE_STAGE_BY_KIND,
  orderedPipelineStages,
} from './stages'
