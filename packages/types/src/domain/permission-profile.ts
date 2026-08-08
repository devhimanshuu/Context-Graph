import type { EntityId, Metadata, Timestamp } from "../primitives";

/* A named, versioned set of permission rules. `rules` is a JSON document */
export interface PermissionProfile {
  id: EntityId;
  organizationId: EntityId;
  /** Null = organization-wide profile; non-null = workspace-scoped. */
  workspaceId: EntityId | null;
  name: string;
  description: string | null;
  rules: Metadata;
  isDefault: boolean;
  version: number;
  metadata: Metadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}

/** Explicit, audited grant of a permission profile to a user. */
export interface PermissionProfileAssignment {
  id: EntityId;
  profileId: EntityId;
  userId: EntityId;
  grantedById: EntityId | null;
  grantedAt: Timestamp;
  revokedAt: Timestamp | null;
}
