/**
 * Application route constants.
 *
 * Every internal route is declared here so that links, redirects, breadcrumbs
 * and navigation never drift. Add new routes here before creating the page.
 *
 * Public surface: `/` (landing) and `/login`. Authenticated surface: the
 * `/dashboard` subtree, guarded by the dashboard layout's session check.
 */
export const ROUTES = {
  /** Public marketing landing page. */
  home: '/',
  /** Sign-in page. */
  login: '/login',
  /** Authenticated dashboard (overview). */
  dashboard: '/dashboard',
  knowledgeGraph: '/dashboard/knowledge-graph',
  rules: '/dashboard/rules',
  permissions: '/dashboard/permissions',
  contexts: '/dashboard/contexts',
  settings: '/dashboard/settings',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

/**
 * Maps a route to its human-readable title.
 *
 * Used by the header breadcrumbs (`src/utils/breadcrumbs.ts`). Keys are
 * pathnames so nested routes resolve too.
 */
export const ROUTE_TITLES: Readonly<Record<string, string>> = {
  [ROUTES.home]: 'Home',
  [ROUTES.login]: 'Sign in',
  [ROUTES.dashboard]: 'Overview',
  [ROUTES.knowledgeGraph]: 'Knowledge Graph',
  [ROUTES.rules]: 'Rules',
  [ROUTES.permissions]: 'Permissions',
  [ROUTES.contexts]: 'Contexts',
  [ROUTES.settings]: 'Settings',
} as const
