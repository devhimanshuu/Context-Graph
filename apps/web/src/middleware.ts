import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/* Clerk middleware (enabled). Owns session protection at the request boundary: */
const isPublicRoute = createRouteMatcher(['/', '/login(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // Clerk requires absolute redirect URLs (relative ones are rejected).
    await auth.protect({ unauthenticatedUrl: new URL('/login', request.url).toString() })
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
