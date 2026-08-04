import type { NextConfig } from 'next'

/**
 * Next.js configuration for ContextGraph.
 *
 * Kept deliberately small in Phase 1. Production hardening (security headers,
 * redirects, rewrites, caching) will be added per-feature in later phases so
 * that configuration changes are always reviewable alongside the code that
 * requires them.
 */
const nextConfig: NextConfig = {
  // React Strict Mode is enabled by default in Next.js 15.
  // Add `typedRoutes` once the routing surface stabilizes in Phase 2.
}

export default nextConfig
