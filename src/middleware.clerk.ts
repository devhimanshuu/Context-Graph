/**
 * ⚠️ DISABLED — Clerk middleware (preserved from an in-progress experiment).
 *
 * This file is intentionally NOT named `middleware.ts` so Next.js does not
 * register it. The mock sign-in flow (`src/lib/auth/session.ts`) currently
 * owns the session, and this middleware previously 404'd every route (it
 * protected `/` and `/login`, and redirected to `/sign-in` which did not
 * exist).
 *
 * To re-enable Clerk auth (Phase 3):
 *   1. Rename this file back to `middleware.ts`.
 *   2. Make `/`, `/login` and `/api/auth/**` public routes.
 *   3. Add `/sign-in` and `/sign-up` pages (Clerk <SignIn />).
 *   4. Remove the mock auth bridge (`src/services/auth/*`, `src/lib/auth/*`).
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define routes that do not require authentication
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
