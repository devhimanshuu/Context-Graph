/**
 * Application metadata.
 *
 * Single source of truth for branding and product identity. Used by the root
 * layout (SEO metadata), the dashboard shell, and server-side responses.
 */
export const APP = {
  name: 'ContextGraph',
  subtitle: 'Enterprise Context Intelligence Platform',
  /** Short brand line used in compact surfaces (logo, badges). */
  tagline: 'Context Intelligence',
  description:
    'ContextGraph is an enterprise knowledge infrastructure platform that retrieves ' +
    'organization-specific knowledge using graph traversal, deterministic rule engines, ' +
    'permission-aware filtering, and context assembly for AI systems.',
  version: '0.1.0',
} as const
