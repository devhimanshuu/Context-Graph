import type { EntityId, Metadata, Timestamp } from "../primitives";
import { RelationshipType } from "../enums";

/** A directed, typed relationship between two knowledge nodes. */
export interface GraphEdge {
  id: EntityId;
  organizationId: EntityId;
  workspaceId: EntityId;
  sourceId: EntityId;
  targetId: EntityId;
  relationshipType: RelationshipType;
  /** Traversal weight (0-1); BFS/DFS engines can prefer stronger edges. */
  weight: number;
  validFrom: Timestamp | null;
  validTo: Timestamp | null;
  metadata: Metadata;
  createdById: EntityId | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}
