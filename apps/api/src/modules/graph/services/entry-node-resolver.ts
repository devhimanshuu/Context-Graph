import { Inject, Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import type { GraphNodeId } from '../domain/graph-node'
import { IGraphRepository } from '../graph.repository'
import { EntryNodeNotFoundError } from '../errors/graph-errors'

/** Context a resolver needs to pick the entry node of a traversal. */
export interface EntryNodeResolutionContext {
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  /** The entry node id requested by the caller. */
  readonly entryNodeId: GraphNodeId
}

/**
 * Contract for resolving the entry node of a traversal. The engine itself
 * never resolves entry nodes — it receives a node id and traverses from it.
 * Future modules (permission engine, department-aware routing) will provide
 * their own implementations of this contract (e.g. User → Department →
 * Entry Node) without changing the engine.
 */
export abstract class IEntryNodeResolver {
  abstract resolve(context: EntryNodeResolutionContext): Promise<GraphNodeId>
}

/**
 * Default resolver: validates that the requested node exists inside the
 * tenant and returns it unchanged. Contains no permission logic by design —
 * that belongs to the permission engine (a later phase).
 */
@Injectable()
export class DefaultEntryNodeResolver implements IEntryNodeResolver {
  constructor(@Inject(IGraphRepository) private readonly repository: IGraphRepository) {}

  async resolve(context: EntryNodeResolutionContext): Promise<GraphNodeId> {
    const [node] = await this.repository.findNodesByIds(context.organizationId, [
      context.entryNodeId,
    ])
    if (node === undefined) {
      throw new EntryNodeNotFoundError(context.entryNodeId)
    }
    return context.entryNodeId
  }
}
