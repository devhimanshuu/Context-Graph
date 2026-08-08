import {
  type ComplianceTag,
  type NodeStatus,
  type NodeType,
  type EntityId,
  type Metadata,
  type Score,
  type Timestamp,
} from '@contextgraph/types'
import { BaseEntity } from '../../common/base/base-entity'

/** A node in the knowledge graph — the unit of retrieval and rule evaluation. */
export class KnowledgeNodeEntity extends BaseEntity {
  constructor(
    readonly id: EntityId,
    readonly organizationId: EntityId,
    readonly workspaceId: EntityId,
    readonly departmentId: EntityId | null,
    readonly title: string,
    readonly content: string,
    readonly type: NodeType,
    readonly status: NodeStatus,
    readonly importance: Score,
    readonly derivabilityScore: Score,
    readonly version: number,
    readonly validFrom: Timestamp | null,
    readonly validTo: Timestamp | null,
    readonly complianceTags: ComplianceTag[],
    readonly metadata: Metadata,
    readonly createdById: EntityId | null,
    readonly updatedById: EntityId | null,
    readonly createdAt: Timestamp,
    readonly updatedAt: Timestamp,
    readonly deletedAt: Timestamp | null,
  ) {
    super()
  }
}
