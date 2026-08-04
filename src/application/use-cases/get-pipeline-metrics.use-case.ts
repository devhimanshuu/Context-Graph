import { type MetricsContextDto } from '@/application/dto'
import { type ILogger } from '@/application/logging'
import { type IMetricsCollector } from '@/application/services/interfaces'
import { type UseCase, type UseCaseFactory } from './base'

/** Input to pipeline-metrics retrieval. */
export interface GetPipelineMetricsUseCaseInput {
  requestId: string
}

export type GetPipelineMetricsUseCaseOutput = MetricsContextDto

/** Service contracts `GetPipelineMetricsUseCase` requires. */
export interface GetPipelineMetricsUseCaseDependencies {
  metricsCollector: IMetricsCollector
  logger: ILogger
}

/**
 * Returns the metrics snapshot for a pipeline run — the data backing the
 * observability and analytics surfaces.
 */ export type IGetPipelineMetricsUseCase = UseCase<
  GetPipelineMetricsUseCaseInput,
  GetPipelineMetricsUseCaseOutput
>

export type GetPipelineMetricsUseCaseFactory = UseCaseFactory<
  IGetPipelineMetricsUseCase,
  GetPipelineMetricsUseCaseDependencies
>
