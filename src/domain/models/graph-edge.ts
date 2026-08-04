import type {
  AuditedEntity,
  EntityWithId,
  OrganizationScoped,
  TemporalEntity,
  WorkspaceScoped,
} from '@/domain/base'
import type { RelationshipType } from '@/domain/enums'

/**
 * A directed, typed relationship between two knowledge nodes — the edge
 * vocabulary of BFS traversal and of the rule/context engines.
 */
export interface GraphEdge
  extends EntityWithId, OrganizationScoped, WorkspaceScoped, AuditedEntity, TemporalEntity {
  sourceId: string
  targetId: string
  relationshipType: RelationshipType
  /** Traversal weight (0-1); traversal engines can prefer stronger edges. */
  weight: number
  metadata: Record<string, unknown>
}
