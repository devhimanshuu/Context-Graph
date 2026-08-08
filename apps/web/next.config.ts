import type { NextConfig } from 'next'

/* Next.js configuration for ContextGraph. Kept deliberately small in Phase 1. Production hardening (security headers, */
const nextConfig: NextConfig = {
  // React Strict Mode is enabled by default in Next.js 15. Add `typedRoutes` once the routing
  // surface stabilizes in Phase 2. Allow CI/verification builds to use an isolated build directory so...
  ...(process.env.NEXT_BUILD_DIR !== undefined ? { distDir: process.env.NEXT_BUILD_DIR } : {}),
}

export default nextConfig
