import { type PipelineRequest, type PipelineResponse } from '@/application/contracts/pipeline'

/**
 * Input contract for a pipeline run.
 *
 * The canonical shapes live in `@/application/contracts/pipeline`;
 * `PipelineRequestDto`/`PipelineResponseDto` are aliases exposed here so use
 * cases and API layers name the *DTO* vocabulary without importing the
 * pipeline machinery. Aliasing (not re-declaring) keeps a single source of
 * truth.
 */
export type PipelineRequestDto = PipelineRequest

/** Output contract of a pipeline run (alias — see contracts/pipeline.ts). */
export type PipelineResponseDto = PipelineResponse
