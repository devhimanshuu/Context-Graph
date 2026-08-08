import type { EntityId, Metadata, Timestamp } from "../primitives";
import {
  ComplianceClearance,
  PermissionLevel,
  Role,
  UserStatus,
} from "../enums";

/** A user within a tenant. Drives permission-aware filtering. */
export interface User {
  id: EntityId;
  organizationId: EntityId;
  departmentId: EntityId | null;
  email: string;
  name: string;
  role: Role;
  permissionLevel: PermissionLevel;
  complianceClearance: ComplianceClearance;
  status: UserStatus;
  /** Opaque provider handle (JWT subject / OIDC sub). */
  authProviderUserId: string | null;
  metadata: Metadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}
