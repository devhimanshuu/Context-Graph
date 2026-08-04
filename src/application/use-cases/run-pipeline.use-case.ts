import { type IEventBus } from '@/application/events'
import { type Pipeline } from '@/application/pipelines'
import { type PipelineRequest, type PipelineResult } from '@/application/contracts/pipeline'
import { type ILogger } from '@/application/logging'
import { type UseCase, type UseCaseFactory } from './base'

/** Service contracts `RunPipelineUseCase` requires. */
export interface RunPipelineUseCaseDependencies {
  pipeline: Pipeline
  eventBus: IEventBus
  logger: ILogger
}

export type RunPipelineUseCaseInput = PipelineRequest

export type RunPipelineUseCaseOutput = PipelineResult

/**
 * Runs the full context-assembly pipeline for a request: entry resolution →
 * traversal → filtering → candidate building, emitting lifecycle events.
 */
export type IRunPipelineUseCase = UseCase<RunPipelineUseCaseInput, RunPipelineUseCaseOutput>

export type RunPipelineUseCaseFactory = UseCaseFactory<
  IRunPipelineUseCase,
  RunPipelineUseCaseDependencies
>
