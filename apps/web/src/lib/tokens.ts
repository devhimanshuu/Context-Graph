/**
 * Consistent semantic color tokens for the app.
 * Replaces ad-hoc color strings scattered across pages.
 *
 * Usage:
 *   className={STATUS_COLORS[status]}
 *   className={TYPE_COLORS[type]}
 */

// ---------------------------------------------------------------------------
// Status colors — used for pipeline runs, document status, agent execution
// ---------------------------------------------------------------------------
export const STATUS_COLORS: Record<string, string> = {
  // Positive / complete
  completed: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  active: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  ready: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  indexed: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',

  // In progress
  running: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  pending: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  processing: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  extracting: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  chunking: 'border-amber-500/40 text-amber-600 dark:text-amber-400',

  // Negative / failure
  failed: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
  error: 'border-rose-500/40 text-rose-600 dark:text-rose-400',

  // Neutral
  draft: 'border-muted text-muted-foreground',
  disabled: 'border-muted text-muted-foreground',
  archived: 'border-muted text-muted-foreground',
  superseded: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  expired: 'border-zinc-500/40 text-zinc-500 dark:text-zinc-400',
  cancelled: 'border-muted text-muted-foreground',
}

// ---------------------------------------------------------------------------
// Node type colors — used for knowledge node types
// ---------------------------------------------------------------------------
export const NODE_TYPE_COLORS: Record<string, string> = {
  FACT: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  CONSTRAINT: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  DECISION: 'border-violet-500/40 text-violet-600 dark:text-violet-400',
  ANTI_PATTERN: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
}

// ---------------------------------------------------------------------------
// Source colors — used for retrieval sources
// ---------------------------------------------------------------------------
export const SOURCE_COLORS: Record<string, string> = {
  graph: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  semantic: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  lexical: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

// ---------------------------------------------------------------------------
// Role colors — used for user roles
// ---------------------------------------------------------------------------
export const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
  HOD: 'border-violet-500/40 text-violet-600 dark:text-violet-400',
  QUALITY: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  AUDITOR: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  EDITOR: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  VIEWER: '',
}

// ---------------------------------------------------------------------------
// Compression hint colors — used for context compression
// ---------------------------------------------------------------------------
export const COMPRESSION_COLORS: Record<string, string> = {
  FULL: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  SUMMARY: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  COMPRESSED: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  REFERENCE_ONLY: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400',
}

// ---------------------------------------------------------------------------
// Industry colors — used for organization industry badges
// ---------------------------------------------------------------------------
export const INDUSTRY_COLORS: Record<string, string> = {
  HEALTHCARE: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  FINANCE: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  LEGAL: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  TECHNOLOGY: 'border-violet-500/40 text-violet-600 dark:text-violet-400',
}

// ---------------------------------------------------------------------------
// Organization status colors
// ---------------------------------------------------------------------------
export const ORG_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  ONBOARDING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  SUSPENDED: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
  ARCHIVED: 'text-muted-foreground',
}

// ---------------------------------------------------------------------------
// Severity colors — used for quality gates and violations
// ---------------------------------------------------------------------------
export const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
  HIGH: 'border-orange-500/40 text-orange-600 dark:text-orange-400',
  WARNING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  INFO: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
}

// ---------------------------------------------------------------------------
// Knowledge node status colors (includes extended statuses)
// ---------------------------------------------------------------------------
export const NODE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  DRAFT: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  SUPERSEDED: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  EXPIRED: 'border-zinc-500/40 text-zinc-500 dark:text-zinc-400',
  LEGAL_HOLD: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
  REVIEW_REQUIRED: 'border-orange-500/40 text-orange-600 dark:text-orange-400',
  ARCHIVED: '',
}

// ---------------------------------------------------------------------------
// Graph relationship type colors
// ---------------------------------------------------------------------------
export const RELATIONSHIP_COLORS: Record<string, string> = {
  SUPPORTS: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  REQUIRES: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  DERIVED_FROM: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  SUPERSEDES: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  CONTRADICTS: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

// ---------------------------------------------------------------------------
// Role colors with background tints
// ---------------------------------------------------------------------------
export const ROLE_TINTED_COLORS: Record<string, string> = {
  ADMIN: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  HOD: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  QUALITY: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  AUDITOR: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  EDITOR: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  VIEWER: '',
}
