import {
  type ContextRuleStatus,
  type EntityId,
  type Metadata,
  type Timestamp,
} from '@contextgraph/types'
import { BaseEntity } from '../../common/base/base-entity'

/** A deterministic rule: condition (JSON AST) → action when it fires. */
export class ContextRuleEntity extends BaseEntity {
  constructor(
    readonly id: EntityId,
    readonly organizationId: EntityId,
    readonly workspaceId: EntityId | null,
    readonly name: string,
    readonly description: string | null,
    readonly condition: Metadata,
    readonly action: Metadata,
    readonly priority: number,
    readonly status: ContextRuleStatus,
    readonly isEnabled: boolean,
    readonly version: number,
    readonly createdById: EntityId | null,
    readonly createdAt: Timestamp,
    readonly updatedAt: Timestamp,
    readonly deletedAt: Timestamp | null,
  ) {
    super()
  }
}
