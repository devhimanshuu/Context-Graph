import { type ICacheProvider } from '@/application/caching'
import { type CandidateNodeDto } from '@/application/dto'
import { type ILogger } from '@/application/logging'
import { type Paginated } from '@/types'
import { type UseCase, type UseCaseFactory } from './base'

/** Input to candidate-set retrieval. */
export interface GetCandidateSetUseCaseInput {
  requestId: string
  organizationId: string
  page: number
  pageSize: number
}

export type GetCandidateSetUseCaseOutput = Paginated<CandidateNodeDto>

/** Service contracts `GetCandidateSetUseCase` requires. */
export interface GetCandidateSetUseCaseDependencies {
  /** Candidate cache (`CacheKeys.candidate(requestId)`). */
  candidateCache: ICacheProvider
  logger: ILogger
}

/**
 * Retrieves the candidate set produced by a previous pipeline run (from the
 * candidate cache), paginated for API consumers.
 */ export type IGetCandidateSetUseCase = UseCase<
  GetCandidateSetUseCaseInput,
  GetCandidateSetUseCaseOutput
>

export type GetCandidateSetUseCaseFactory = UseCaseFactory<
  IGetCandidateSetUseCase,
  GetCandidateSetUseCaseDependencies
>
