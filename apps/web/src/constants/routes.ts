/* Application route constants. Every internal route is declared here so that links, redirects, breadcrumbs */
export const ROUTES = {
  /** Public marketing landing page. */
  home: '/',
  /** Sign-in page. */
  login: '/login',
  /** Sign-up page. */
  signUp: '/sign-up',
  /** Post-sign-up onboarding flow. */
  onboarding: '/onboarding',
  /** Authenticated dashboard (overview). */
  dashboard: '/dashboard',
  knowledgeGraph: '/dashboard/knowledge-graph',
  pipeline: '/dashboard/pipeline',
  rules: '/dashboard/rules',
  permissions: '/dashboard/permissions',
  contexts: '/dashboard/contexts',
  audit: '/dashboard/audit',
  users: '/dashboard/users',
  departments: '/dashboard/departments',
  analytics: '/dashboard/analytics',
  configuration: '/dashboard/configuration',
  settings: '/dashboard/settings',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

/* Maps a route to its human-readable title. Used by the header breadcrumbs (`src/utils/breadcrumbs.ts`). Keys are */
export const ROUTE_TITLES: Readonly<Record<string, string>> = {
  [ROUTES.home]: 'Home',
  [ROUTES.login]: 'Sign in',
  [ROUTES.signUp]: 'Sign up',
  [ROUTES.onboarding]: 'Welcome',
  [ROUTES.dashboard]: 'Overview',
  [ROUTES.knowledgeGraph]: 'Knowledge Graph',
  [ROUTES.pipeline]: 'Pipeline',
  [ROUTES.rules]: 'Rules',
  [ROUTES.permissions]: 'Permissions',
  [ROUTES.contexts]: 'Contexts',
  [ROUTES.audit]: 'Audit',
  [ROUTES.users]: 'Users',
  [ROUTES.departments]: 'Departments',
  [ROUTES.analytics]: 'Analytics',
  [ROUTES.configuration]: 'Configuration',
  [ROUTES.settings]: 'Settings',
} as const
