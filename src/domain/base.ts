/**
 * Shared domain base types.
 *
 * Every domain entity composes these contracts so auditability, soft deletes,
 * temporal validity and tenant scoping behave identically across the model —
 * no exceptions, no drift.
 */

/** Rows created/updated by the store. */
export interface TimestampedEntity {
  createdAt: Date
  updatedAt: Date
}

/** Soft-delete support: a non-null `deletedAt` marks the row as deleted. */
export interface SoftDeletableEntity {
  deletedAt: Date | null
}

/** Content entities carry the last actor for both writes. */
export interface AuditedEntity extends TimestampedEntity, SoftDeletableEntity {
  createdById: string | null
  updatedById: string | null
}

/** Entities with a validity window for temporal filtering. */
export interface TemporalEntity {
  validFrom: Date | null
  validTo: Date | null
}

/** Anchor to the owning tenant — the isolation boundary of every query. */
export interface OrganizationScoped {
  organizationId: string
}

/** Anchor to a workspace (knowledge container) inside a tenant. */
export interface WorkspaceScoped {
  workspaceId: string
}

/** Every entity has a UUID primary key. */
export interface EntityWithId {
  id: string
}
