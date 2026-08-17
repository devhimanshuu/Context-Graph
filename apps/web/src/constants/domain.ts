/* Domain enum value arrays. Single source of truth for allowed enum values at the validation layer. */

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

export type ComplianceTagValue = (typeof COMPLIANCE_TAG_VALUES)[number]

/** Short human-readable meaning for each compliance tag — shared by the editor
 *  chips, the node detail sheet and the analytics tag breakdown. */
export const COMPLIANCE_TAG_DESCRIPTIONS: Record<ComplianceTagValue, string> = {
  HIPAA: 'Protected health data',
  GDPR: 'EU data subject rights',
  PCI_DSS: 'Cardholder data security',
  SOC2: 'Trust services controls',
  SOX: 'Financial records compliance',
  FINRA: 'Securities record keeping',
  ISO_27001: 'Information security management',
  PHI: 'Protected health information',
  PII: 'Personally identifiable information',
  CONFIDENTIAL: 'Internal confidential material',
  RESTRICTED: 'High-sensitivity restricted data',
  INTERNAL: 'Internal use only',
  PUBLIC: 'Public disclosure safe',
}

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

/* Presentation vocabulary for the graph's typed nodes — display labels and */
export const NODE_TYPE_TICKER_ITEMS = [
  { label: 'Fact', tone: 'bg-sky-400' },
  { label: 'Constraint', tone: 'bg-amber-400' },
  { label: 'Decision', tone: 'bg-indigo-400' },
  { label: 'Anti-pattern', tone: 'bg-rose-400' },
  { label: 'Policy', tone: 'bg-emerald-400' },
  { label: 'Precedent', tone: 'bg-violet-400' },
  { label: 'Workflow', tone: 'bg-teal-400' },
] as const
