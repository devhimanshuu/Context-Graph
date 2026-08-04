import type {
  AuditedEntity,
  EntityWithId,
  OrganizationScoped,
  TemporalEntity,
  WorkspaceScoped,
} from '@/domain/base'
import type { ComplianceTag, NodeStatus, NodeType } from '@/domain/enums'

/**
 * A node in the knowledge graph: a fact, constraint, decision or anti-pattern.
 * The unit of retrieval, permission checking and rule evaluation.
 */
export interface KnowledgeNode
  extends EntityWithId, OrganizationScoped, WorkspaceScoped, AuditedEntity, TemporalEntity {
  /** Owning department, when knowledge is attributed to an org unit. */
  departmentId: string | null
  title: string
  content: string
  type: NodeType
  status: NodeStatus
  /** Retrieval importance 0-100; ranks context assembly output. */
  importance: number
  /** 0-100 confidence that the node is derivable from other nodes. */
  derivabilityScore: number
  /** Current content version (node versioning module, later phase). */
  version: number
  metadata: Record<string, unknown>
}

/** Normalized junction between a node and one of its compliance tags. */
export interface KnowledgeNodeComplianceTag {
  knowledgeNodeId: string
  tag: ComplianceTag
}
