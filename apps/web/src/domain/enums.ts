/* Domain enum unions. Declared as plain string-literal unions (not Prisma imports) so the domain */

export type OrganizationStatus = 'ONBOARDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'

export type Industry =
  | 'HEALTHCARE'
  | 'FINANCE'
  | 'LEGAL'
  | 'TECHNOLOGY'
  | 'EDUCATION'
  | 'MANUFACTURING'
  | 'RETAIL'
  | 'GOVERNMENT'
  | 'OTHER'

export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'

export type NodeType = 'FACT' | 'CONSTRAINT' | 'DECISION' | 'ANTI_PATTERN'

export type NodeStatus =
  'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'EXPIRED' | 'LEGAL_HOLD' | 'REVIEW_REQUIRED' | 'ARCHIVED'

export type RelationshipType =
  'SUPPORTS' | 'REQUIRES' | 'DERIVED_FROM' | 'SUPERSEDES' | 'CONTRADICTS'

export type ComplianceTag =
  | 'HIPAA'
  | 'GDPR'
  | 'PCI_DSS'
  | 'SOC2'
  | 'SOX'
  | 'FINRA'
  | 'ISO_27001'
  | 'PHI'
  | 'PII'
  | 'CONFIDENTIAL'
  | 'RESTRICTED'
  | 'INTERNAL'
  | 'PUBLIC'

export type Role = 'ADMIN' | 'HOD' | 'EDITOR' | 'VIEWER' | 'QUALITY' | 'AUDITOR'

export type UserStatus = 'INVITED' | 'ACTIVE' | 'DISABLED'

export type PermissionLevel = 'NONE' | 'READ' | 'WRITE' | 'ADMIN'

export type ComplianceClearance = 'NONE' | 'STANDARD' | 'SENSITIVE' | 'RESTRICTED' | 'CRITICAL'

export type ContextRuleStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
