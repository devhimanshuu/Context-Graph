import { type ComplianceTag, type NodeStatus, type NodeType } from '@/domain/enums'

/**
 * A knowledge node projected for pipeline consumption (post-traversal,
 * pre-candidate). Produced by `INodeMapper` from the domain `KnowledgeNode`
 * and its compliance-tag junction rows.
 */
export interface NodeContextDto {
  nodeId: string
  workspaceId: string
  title: string
  type: NodeType
  status: NodeStatus
  /** Retrieval importance 0-100; ranks context assembly output. */
  importance: number
  /** 0-100 confidence that the node is derivable from other nodes. */
  derivabilityScore: number
  complianceTags: ComplianceTag[]
  validFrom: Date | null
  validTo: Date | null
  metadata: Record<string, unknown>
}
