/* ContextGraph — domain enums. These mirror the Postgres enums declared in `apps/api/prisma/schema.prisma`. */

/** Lifecycle of an organization (tenant). */
export const OrganizationStatus = {
  ONBOARDING: "ONBOARDING",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED",
} as const;
export type OrganizationStatus =
  (typeof OrganizationStatus)[keyof typeof OrganizationStatus];

/** Broad industry classification. Never shapes queries. */
export const Industry = {
  HEALTHCARE: "HEALTHCARE",
  FINANCE: "FINANCE",
  LEGAL: "LEGAL",
  TECHNOLOGY: "TECHNOLOGY",
  EDUCATION: "EDUCATION",
  MANUFACTURING: "MANUFACTURING",
  RETAIL: "RETAIL",
  GOVERNMENT: "GOVERNMENT",
  OTHER: "OTHER",
} as const;
export type Industry = (typeof Industry)[keyof typeof Industry];

/** Lifecycle of a workspace (a domain container inside an organization). */
export const WorkspaceStatus = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;
export type WorkspaceStatus =
  (typeof WorkspaceStatus)[keyof typeof WorkspaceStatus];

/** Semantic kind of a knowledge node. Domain-agnostic by design. */
export const NodeType = {
  FACT: "FACT",
  CONSTRAINT: "CONSTRAINT",
  DECISION: "DECISION",
  ANTI_PATTERN: "ANTI_PATTERN",
} as const;
export type NodeType = (typeof NodeType)[keyof typeof NodeType];

/** Lifecycle of a knowledge node. */
export const NodeStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  SUPERSEDED: "SUPERSEDED",
  EXPIRED: "EXPIRED",
  LEGAL_HOLD: "LEGAL_HOLD",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  ARCHIVED: "ARCHIVED",
} as const;
export type NodeStatus = (typeof NodeStatus)[keyof typeof NodeStatus];

/** Semantic meaning of a directed edge — the vocabulary of graph traversal. */
export const RelationshipType = {
  SUPPORTS: "SUPPORTS",
  REQUIRES: "REQUIRES",
  DERIVED_FROM: "DERIVED_FROM",
  SUPERSEDES: "SUPERSEDES",
  CONTRADICTS: "CONTRADICTS",
} as const;
export type RelationshipType =
  (typeof RelationshipType)[keyof typeof RelationshipType];

/** Regulatory/compliance classifications attachable to knowledge nodes. */
export const ComplianceTag = {
  HIPAA: "HIPAA",
  GDPR: "GDPR",
  PCI_DSS: "PCI_DSS",
  SOC2: "SOC2",
  SOX: "SOX",
  FINRA: "FINRA",
  ISO_27001: "ISO_27001",
  PHI: "PHI",
  PII: "PII",
  CONFIDENTIAL: "CONFIDENTIAL",
  RESTRICTED: "RESTRICTED",
  INTERNAL: "INTERNAL",
  PUBLIC: "PUBLIC",
} as const;
export type ComplianceTag = (typeof ComplianceTag)[keyof typeof ComplianceTag];

/** Functional role of a user inside an organization. */
export const Role = {
  ADMIN: "ADMIN",
  HOD: "HOD",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
  QUALITY: "QUALITY",
  AUDITOR: "AUDITOR",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/** Account lifecycle of a user. */
export const UserStatus = {
  INVITED: "INVITED",
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/** Granular write capability; refined by the permission compiler per-entity. */
export const PermissionLevel = {
  NONE: "NONE",
  READ: "READ",
  WRITE: "WRITE",
  ADMIN: "ADMIN",
} as const;
export type PermissionLevel =
  (typeof PermissionLevel)[keyof typeof PermissionLevel];

/** Highest compliance class a user may see. */
export const ComplianceClearance = {
  NONE: "NONE",
  STANDARD: "STANDARD",
  SENSITIVE: "SENSITIVE",
  RESTRICTED: "RESTRICTED",
  CRITICAL: "CRITICAL",
} as const;
export type ComplianceClearance =
  (typeof ComplianceClearance)[keyof typeof ComplianceClearance];

/** Lifecycle of a deterministic context rule. */
export const ContextRuleStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ContextRuleStatus =
  (typeof ContextRuleStatus)[keyof typeof ContextRuleStatus];

/** Primitive actions the permission engine can grant/deny on entities. */
export const PermissionAction = {
  READ: "READ",
  WRITE: "WRITE",
  DELETE: "DELETE",
  MANAGE: "MANAGE",
} as const;
export type PermissionAction =
  (typeof PermissionAction)[keyof typeof PermissionAction];

/** Kinds of auditable entities (polymorphic target of an audit entry). */
export const AuditEntityType = {
  ORGANIZATION: "ORGANIZATION",
  WORKSPACE: "WORKSPACE",
  DEPARTMENT: "DEPARTMENT",
  USER: "USER",
  KNOWLEDGE_NODE: "KNOWLEDGE_NODE",
  GRAPH_EDGE: "GRAPH_EDGE",
  PERMISSION_PROFILE: "PERMISSION_PROFILE",
  CONTEXT_RULE: "CONTEXT_RULE",
} as const;
export type AuditEntityType =
  (typeof AuditEntityType)[keyof typeof AuditEntityType];
