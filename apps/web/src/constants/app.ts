/* Application metadata. Single source of truth for branding and product identity. Used by the root */
export const APP = {
  name: 'ContextGraph',
  subtitle: 'Enterprise Context Intelligence Platform',
  /** Short brand line used in compact surfaces (logo, badges). */
  tagline: 'Context Intelligence',
  description:
    'The governed context, memory, and guardrail infrastructure layer for AI agents. ' +
    'Retrieval alone cannot enforce policy — ContextGraph adds deterministic rules, ' +
    'permission filtering, and full auditability to every context decision.',
  /** Hero headline — concise value proposition. */
  heroHeadline: 'The governed context layer for AI that regulators trust.',
  /** Hero sub-headline. */
  heroSubheadline:
    'AI agents see only what they are authorized to know. Every context decision is ' +
    'deterministic, permission-aware, and fully auditable — from retrieval through to response.',
  version: '0.1.0',
} as const
