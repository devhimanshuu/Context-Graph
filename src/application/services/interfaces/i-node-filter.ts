import { type NodeContextDto, type UserContextDto } from '@/application/dto'

/** The kinds of node filtering a pipeline stage can apply. */
export type NodeFilterKind = 'ISOLATION' | 'COMPLIANCE' | 'PERMISSION' | 'TEMPORAL' | 'DERIVABILITY'

/** Input to a node filter. */
export interface NodeFilterInput {
  organizationId: string
  workspaceId: string
  nodes: NodeContextDto[]
  user: UserContextDto
}

/**
 * Generic node filter contract. Each filter stage (isolation, compliance,
 * permission, temporal, derivability) is an `INodeFilter` bound to one
 * `kind`; the pipeline stage wraps the filter and records stage metrics.
 *
 * Filters are pure (input nodes → output nodes) so they can be composed,
 * unit-tested in isolation, and reused by the filter use case.
 */
export interface INodeFilter {
  readonly kind: NodeFilterKind
  apply(input: NodeFilterInput): Promise<NodeContextDto[]>
}
