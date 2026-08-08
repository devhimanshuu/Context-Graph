import type { EntityId, Metadata, Timestamp } from "../primitives";
import { ContextRuleStatus } from "../enums";

/* A deterministic rule for the rule engine: condition (JSON AST) evaluated */
export interface ContextRule {
  id: EntityId;
  organizationId: EntityId;
  /** Null = organization-wide rule. */
  workspaceId: EntityId | null;
  name: string;
  description: string | null;
  condition: Metadata;
  action: Metadata;
  priority: number;
  status: ContextRuleStatus;
  isEnabled: boolean;
  version: number;
  validFrom: Timestamp | null;
  validTo: Timestamp | null;
  createdById: EntityId | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}
