import { type UserContextDto } from '@/application/dto'

/** Input to entry-node resolution. */
export interface ResolveEntryNodesInput {
  organizationId: string
  workspaceId: string
  /** Natural-language or structured query the entry nodes must answer to. */
  query?: string
  user: UserContextDto
}

/** Output of entry-node resolution. */
export interface ResolveEntryNodesOutput {
  entryNodeIds: string[]
}

/**
 * Resolves the traversal entry node(s) for a request: by explicit ids,
 * by matching the query against node titles/metadata, or by workspace rules.
 * The entry-resolver stage and `ResolveEntryNodeUseCase` depend on this
 * contract.
 */
export interface IEntryResolver {
  resolve(input: ResolveEntryNodesInput): Promise<ResolveEntryNodesOutput>
}
