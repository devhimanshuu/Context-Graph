import type { KnowledgeNode } from '@/domain/models'
import type { ComplianceTag, NodeStatus, NodeType } from '@/domain/enums'
import type { PageQuery, PageResult } from '@/types'
import type {
  CreateKnowledgeNodeSchema,
  UpdateKnowledgeNodeSchema,
} from '@/validations/knowledge-node'
import type { BaseRepository } from '@/repositories/base'

/**
 * KnowledgeNode data-access contract.
 *
 * Method shapes are designed for the future hot paths: workspace-scoped
 * retrieval, active/valid filtering, compliance filtering, and traversal
 * helpers (superseding links). Implementations land with the graph features.
 */
export interface KnowledgeNodeRepository extends BaseRepository<
  KnowledgeNode,
  string,
  CreateKnowledgeNodeSchema,
  UpdateKnowledgeNodeSchema
> {
  findByOrganization(organizationId: string, params: PageQuery): Promise<PageResult<KnowledgeNode>>

  findByWorkspace(workspaceId: string, params: PageQuery): Promise<PageResult<KnowledgeNode>>

  /** Nodes in `ACTIVE` status — the default retrieval filter. */
  findActive(workspaceId: string, params: PageQuery): Promise<PageResult<KnowledgeNode>>

  findByType(
    workspaceId: string,
    type: NodeType,
    params: PageQuery,
  ): Promise<PageResult<KnowledgeNode>>

  findByStatus(
    workspaceId: string,
    status: NodeStatus,
    params: PageQuery,
  ): Promise<PageResult<KnowledgeNode>>

  /** Nodes carrying a compliance tag (compliance-filtered retrieval). */
  findByComplianceTag(
    workspaceId: string,
    tag: ComplianceTag,
    params: PageQuery,
  ): Promise<PageResult<KnowledgeNode>>

  /** Nodes whose validity window contains `at` (temporal filtering). */
  findValidAt(workspaceId: string, at: Date, params: PageQuery): Promise<PageResult<KnowledgeNode>>

  findByDepartment(departmentId: string, params: PageQuery): Promise<PageResult<KnowledgeNode>>
}
