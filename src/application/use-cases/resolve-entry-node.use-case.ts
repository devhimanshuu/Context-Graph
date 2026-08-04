import { type UserContextDto } from '@/application/dto'
import { type IEntryResolver } from '@/application/services/interfaces'
import { type ILogger } from '@/application/logging'
import { type UseCase, type UseCaseFactory } from './base'

/** Input to entry-node resolution. */
export interface ResolveEntryNodeUseCaseInput {
  organizationId: string
  workspaceId: string
  query?: string
  user: UserContextDto
}

/** Output of entry-node resolution. */
export interface ResolveEntryNodeUseCaseOutput {
  entryNodeIds: string[]
}

/** Service contracts `ResolveEntryNodeUseCase` requires. */
export interface ResolveEntryNodeUseCaseDependencies {
  entryResolver: IEntryResolver
  logger: ILogger
}

/**
 * Resolves the entry node(s) a traversal should start from, honoring
 * explicit ids, query matching, and workspace rules.
 */ export type IResolveEntryNodeUseCase = UseCase<
  ResolveEntryNodeUseCaseInput,
  ResolveEntryNodeUseCaseOutput
>

export type ResolveEntryNodeUseCaseFactory = UseCaseFactory<
  IResolveEntryNodeUseCase,
  ResolveEntryNodeUseCaseDependencies
>
