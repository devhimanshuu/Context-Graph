import { type CandidateNodeDto, type NodeContextDto } from '@/application/dto'
import { type ILogger } from '@/application/logging'
import { type ICandidateAssembler } from '@/application/services/interfaces'
import { type UseCase, type UseCaseFactory } from './base'

/** Input to candidate-set construction. */
export interface BuildCandidateSetUseCaseInput {
  organizationId: string
  workspaceId: string
  nodes: NodeContextDto[]
  maxCandidates: number
}

export type BuildCandidateSetUseCaseOutput = CandidateNodeDto[]

/** Service contracts `BuildCandidateSetUseCase` requires. */
export interface BuildCandidateSetUseCaseDependencies {
  candidateAssembler: ICandidateAssembler
  logger: ILogger
}

/**
 * Ranks and assembles a candidate set from an arbitrary filtered node list —
 * the final step of context assembly, reusable outside the full pipeline.
 */ export type IBuildCandidateSetUseCase = UseCase<
  BuildCandidateSetUseCaseInput,
  BuildCandidateSetUseCaseOutput
>

export type BuildCandidateSetUseCaseFactory = UseCaseFactory<
  IBuildCandidateSetUseCase,
  BuildCandidateSetUseCaseDependencies
>
