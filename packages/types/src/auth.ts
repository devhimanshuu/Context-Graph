import type { EntityId } from "./primitives";
import { ComplianceClearance, PermissionLevel, Role } from "./enums";

/* The authenticated principal attached to every request by the JWT guard. */
export interface AuthenticatedUser {
  id: EntityId;
  organizationId: EntityId;
  departmentId: EntityId | null;
  email: string;
  name: string;
  role: Role;
  permissionLevel: PermissionLevel;
  complianceClearance: ComplianceClearance;
}

/** Shape of the signed JWT access token. */
export interface AccessTokenPayload {
  sub: EntityId;
  org: EntityId;
  /** Numeric epoch seconds (standard `exp` is added by the signer). */
  iat: number;
}
