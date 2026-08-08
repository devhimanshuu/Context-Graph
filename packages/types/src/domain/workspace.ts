import type { EntityId, Metadata, Timestamp } from "../primitives";
import { WorkspaceStatus } from "../enums";

/** A named domain container inside an organization (e.g. "Inpatient Assessment"). */
export interface Workspace {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  slug: string;
  description: string | null;
  status: WorkspaceStatus;
  metadata: Metadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}
