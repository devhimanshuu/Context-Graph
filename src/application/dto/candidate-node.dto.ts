import { type ComplianceTag, type NodeType } from '@/domain/enums'

/**
 * A node that survived every pipeline filter and was ranked into the final
 * context package — the unit of output for AI context assembly.
 */
export interface CandidateNodeDto {
  nodeId: string
  workspaceId: string
  title: string
  type: NodeType
  importance: number
  derivabilityScore: number
  complianceTags: ComplianceTag[]
  /** Composite relevance score 0-1 used to order the final context. */
  relevanceScore: number
  /** Provenance trace: how this node was reached (entry → traversal path). */
  provenance: string[]
  metadata: Record<string, unknown>
}
