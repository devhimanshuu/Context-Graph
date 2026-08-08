import type { EntityId, Metadata, Score, Timestamp } from "../primitives";
import { ComplianceTag, NodeStatus, NodeType } from "../enums";

/** A node in the knowledge graph — the unit of retrieval and rule evaluation. */
export interface KnowledgeNode {
  id: EntityId;
  organizationId: EntityId;
  workspaceId: EntityId;
  /** Owning department, when knowledge is attributed to an org unit. */
  departmentId: EntityId | null;
  title: string;
  content: string;
  type: NodeType;
  status: NodeStatus;
  /** Retrieval importance 0-100; used to rank context assembly output. */
  importance: Score;
  /** 0-100 confidence that this node is derivable from others. */
  derivabilityScore: Score;
  /** Current content version (node versioning module). */
  version: number;
  /** Validity window for temporal filtering. */
  validFrom: Timestamp | null;
  validTo: Timestamp | null;
  complianceTags: ComplianceTag[];
  metadata: Metadata;
  createdById: EntityId | null;
  updatedById: EntityId | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}
