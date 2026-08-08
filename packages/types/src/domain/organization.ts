import type { EntityId, Metadata, Timestamp } from "../primitives";
import { Industry, OrganizationStatus } from "../enums";

/** A tenant. All business data hangs off an Organization. */
export interface Organization {
  id: EntityId;
  name: string;
  slug: string;
  industry: Industry;
  status: OrganizationStatus;
  /** Flexible tenant-level configuration (branding, feature flags, limits). */
  configuration: Metadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}
