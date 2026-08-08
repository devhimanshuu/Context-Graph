import type { EntityId, Timestamp } from '@contextgraph/types'

/* Base class for every domain entity. All entities share audit fields so */
export abstract class BaseEntity {
  abstract id: EntityId
  abstract createdAt: Timestamp
  abstract updatedAt: Timestamp
  abstract deletedAt: Timestamp | null
}
