import { type NodeContextDto, type UserContextDto } from '@/application/dto'
import { type ILogger } from '@/application/logging'
import { type INodeFilter, type NodeFilterKind } from '@/application/services/interfaces'
import { type UseCase, type UseCaseFactory } from './base'

/** Input to node filtering. */
export interface FilterKnowledgeNodesUseCaseInput {
  organizationId: string
  workspaceId: string
  nodes: NodeContextDto[]
  user: UserContextDto
  /** Which filter kinds to apply; defaults to all applicable kinds. */
  kinds?: NodeFilterKind[]
}

export type FilterKnowledgeNodesUseCaseOutput = NodeContextDto[]

/** Service contracts `FilterKnowledgeNodesUseCase` requires. */
export interface FilterKnowledgeNodesUseCaseDependencies {
  /** All registered filters, keyed by kind. */
  filters: Readonly<Partial<Record<NodeFilterKind, INodeFilter>>>
  logger: ILogger
}

/**
 * Applies the requested node filters (isolation, compliance, permission,
 * temporal, derivability) to an arbitrary node set — the reusable filtering
 * primitive the pipeline stages and the graph UI both use.
 */ export type IFilterKnowledgeNodesUseCase = UseCase<
  FilterKnowledgeNodesUseCaseInput,
  FilterKnowledgeNodesUseCaseOutput
>

export type FilterKnowledgeNodesUseCaseFactory = UseCaseFactory<
  IFilterKnowledgeNodesUseCase,
  FilterKnowledgeNodesUseCaseDependencies
>
