import type { AuthenticatedUser, EntityId, Timestamp } from '@contextgraph/types'
import type { CompiledAuthorizationContext } from '../../authorization/domain/authorization-context'
import type { RuleEngineConfig } from '../configuration/rule-engine.config'
import type { RuleCandidateNode } from './candidate-node'

/**
 * Immutable execution context shared by every rule in a pipeline run.
 *
 * The authorization context is compiled ONCE by the caller and reused for all
 * nodes — rules never query the database and never read the clock (the
 * evaluation instant is injected so identical inputs produce identical
 * results).
 */
export interface RuleExecutionContext {
  readonly requestId: string
  readonly user: AuthenticatedUser
  /** Server-derived authorization state — the single source of truth. */
  readonly authorization: CompiledAuthorizationContext
  readonly organizationId: EntityId
  readonly workspaceId: EntityId
  readonly entryNodeIds: readonly EntityId[]
  /** The authorized input set (graph-reachable + permission-authorized). */
  readonly nodes: readonly RuleCandidateNode[]
  /** Fixed evaluation instant (UTC). Determinism: never Date.now() inside rules. */
  readonly evaluatedAt: Timestamp
  /** Resolved pipeline configuration for this run (defaults merged with overrides). */
  readonly config: RuleEngineConfig
  /** Free-form run metadata (future: request tags, trace ids). */
  readonly executionMetadata: Readonly<Record<string, unknown>>
}
