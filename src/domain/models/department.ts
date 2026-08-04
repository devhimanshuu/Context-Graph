import type {
  EntityWithId,
  OrganizationScoped,
  SoftDeletableEntity,
  TimestampedEntity,
} from '@/domain/base'

/**
 * An organizational unit with arbitrary hierarchy depth (self-referencing).
 * Departments own knowledge domains and group users; they are not the
 * security boundary — Workspace is.
 */
export interface Department
  extends EntityWithId, OrganizationScoped, TimestampedEntity, SoftDeletableEntity {
  /** Parent department id, null for root departments. */
  parentId: string | null
  name: string
  /** Stable, org-unique short identifier referenced by permission rules. */
  code: string
  /** 0 = root; grows downward. Enables level-based filtering. */
  hierarchyLevel: number
  metadata: Record<string, unknown>
}
