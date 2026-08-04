/**
 * Domain enum value arrays.
 *
 * Single source of truth for allowed enum values at the validation layer.
 * Kept in sync with `src/prisma/schema.prisma` enums (and the domain unions
 * in `src/domain/enums.ts`) — extend all three together when adding values.
 *
 * Declaring these here (instead of importing from `@prisma/client`) keeps
 * validation schemas usable in pure environments and gives Zod the exact
 * literal tuples it needs.
 */

export const ORGANIZATION_STATUS_VALUES = ['ONBOARDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'] as const

export const INDUSTRY_VALUES = [
  'HEALTHCARE',
  'FINANCE',
  'LEGAL',
  'TECHNOLOGY',
  'EDUCATION',
  'MANUFACTURING',
  'RETAIL',
  'GOVERNMENT',
  'OTHER',
] as const

export const WORKSPACE_STATUS_VALUES = ['ACTIVE', 'ARCHIVED'] as const

export const NODE_TYPE_VALUES = ['FACT', 'CONSTRAINT', 'DECISION', 'ANTI_PATTERN'] as const

export const NODE_STATUS_VALUES = [
  'DRAFT',
  'ACTIVE',
  'SUPERSEDED',
  'EXPIRED',
  'LEGAL_HOLD',
  'REVIEW_REQUIRED',
  'ARCHIVED',
] as const

export const RELATIONSHIP_TYPE_VALUES = [
  'SUPPORTS',
  'REQUIRES',
  'DERIVED_FROM',
  'SUPERSEDES',
  'CONTRADICTS',
] as const

export const COMPLIANCE_TAG_VALUES = [
  'HIPAA',
  'GDPR',
  'PCI_DSS',
  'SOC2',
  'SOX',
  'FINRA',
  'ISO_27001',
  'PHI',
  'PII',
  'CONFIDENTIAL',
  'RESTRICTED',
  'INTERNAL',
  'PUBLIC',
] as const

export const ROLE_VALUES = ['ADMIN', 'HOD', 'EDITOR', 'VIEWER', 'QUALITY', 'AUDITOR'] as const

export const USER_STATUS_VALUES = ['INVITED', 'ACTIVE', 'DISABLED'] as const

export const PERMISSION_LEVEL_VALUES = ['NONE', 'READ', 'WRITE', 'ADMIN'] as const

export const COMPLIANCE_CLEARANCE_VALUES = [
  'NONE',
  'STANDARD',
  'SENSITIVE',
  'RESTRICTED',
  'CRITICAL',
] as const

export const CONTEXT_RULE_STATUS_VALUES = ['DRAFT', 'ACTIVE', 'DISABLED', 'ARCHIVED'] as const
