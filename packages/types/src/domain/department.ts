import type { EntityId, Metadata, Timestamp } from "../primitives";

/** An organizational unit with arbitrary hierarchy depth. */
export interface Department {
  id: EntityId;
  organizationId: EntityId;
  /** Parent department (null = root). */
  parentId: EntityId | null;
  name: string;
  /** Stable, org-unique short identifier used in permission rules. */
  code: string;
  /** 0 = root; grows downward. Enables level-based filtering. */
  hierarchyLevel: number;
  metadata: Metadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}
