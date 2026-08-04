import { type TraversalContextDto, type UserContextDto } from '@/application/dto'
import { type ILogger } from '@/application/logging'
import { type IGraphTraversalService } from '@/application/services/interfaces'
import { type UseCase, type UseCaseFactory } from './base'

/** Input to a standalone graph traversal. */
export interface TraverseGraphUseCaseInput {
  organizationId: string
  workspaceId: string
  entryNodeIds: string[]
  maxDepth: number
  user: UserContextDto
}

export type TraverseGraphUseCaseOutput = TraversalContextDto

/** Service contracts `TraverseGraphUseCase` requires. */
export interface TraverseGraphUseCaseDependencies {
  traversal: IGraphTraversalService
  logger: ILogger
}

/**
 * Performs a standalone (non-pipeline) graph traversal from the given entry
 * nodes — the building block for APIs, diagnostics, and the graph UI.
 */ export type ITraverseGraphUseCase = UseCase<
  TraverseGraphUseCaseInput,
  TraverseGraphUseCaseOutput
>

export type TraverseGraphUseCaseFactory = UseCaseFactory<
  ITraverseGraphUseCase,
  TraverseGraphUseCaseDependencies
>
