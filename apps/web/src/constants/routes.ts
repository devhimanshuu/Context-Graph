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
  knowledge: '/dashboard/knowledge',
  pipeline: '/dashboard/pipeline',
  rules: '/dashboard/rules',
  permissions: '/dashboard/permissions',
  contexts: '/dashboard/contexts',
  audit: '/dashboard/audit',
  users: '/dashboard/users',
  departments: '/dashboard/departments',
  organizations: '/dashboard/organizations',
  analytics: '/dashboard/analytics',
  configuration: '/dashboard/configuration',
  settings: '/dashboard/settings',
  ingestion: '/dashboard/ingestion',
  evaluation: '/dashboard/evaluation',
  ai: '/dashboard/ai',
  retrieval: '/dashboard/retrieval',
  agents: '/dashboard/agents',
  governance: '/dashboard/governance',
  governancePolicies: '/dashboard/governance/policies',
  governanceModels: '/dashboard/governance/models',
  governanceBudgets: '/dashboard/governance/budgets',
  governanceTeams: '/dashboard/governance/teams',
  governanceRoles: '/dashboard/governance/roles',
  guardrails: '/dashboard/guardrails',
  proposals: '/dashboard/proposals',
  proposalApprovals: '/dashboard/proposals/approvals',
  events: '/dashboard/events',
  agentPlayground: '/dashboard/agent-playground',
  agentIdentities: '/dashboard/agents/identity',
  multiAgentDemo: '/dashboard/agent-playground/multi-agent',
  apiMcp: '/dashboard/api',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

/** Deep-link to one immutable pipeline run by its requestId (the URL param of the detail route). */
export function pipelineRunDetail(requestId: string): string {
  return `${ROUTES.pipeline}/${encodeURIComponent(requestId)}`
}

/* Maps a route to its human-readable title. Used by the header breadcrumbs (`src/utils/breadcrumbs.ts`). Keys are */
export const ROUTE_TITLES: Readonly<Record<string, string>> = {
  [ROUTES.home]: 'Home',
  [ROUTES.login]: 'Sign in',
  [ROUTES.signUp]: 'Sign up',
  [ROUTES.onboarding]: 'Welcome',
  [ROUTES.dashboard]: 'Overview',
  [ROUTES.knowledgeGraph]: 'Knowledge Graph',
  [ROUTES.knowledge]: 'Knowledge',
  [ROUTES.pipeline]: 'Pipeline',
  [ROUTES.rules]: 'Rules',
  [ROUTES.permissions]: 'Permissions',
  [ROUTES.contexts]: 'Contexts',
  [ROUTES.audit]: 'Audit',
  [ROUTES.users]: 'Users',
  [ROUTES.departments]: 'Departments',
  [ROUTES.organizations]: 'Organization',
  [ROUTES.analytics]: 'Analytics',
  [ROUTES.configuration]: 'Configuration',
  [ROUTES.settings]: 'Settings',
  [ROUTES.ingestion]: 'Ingestion',
  [ROUTES.evaluation]: 'Evaluation',
  [ROUTES.ai]: 'AI Chat',
  [ROUTES.retrieval]: 'Retrieval',
  [ROUTES.agents]: 'Agents',
  [ROUTES.governance]: 'Governance',
  [ROUTES.governancePolicies]: 'Policies',
  [ROUTES.governanceModels]: 'Model Governance',
  [ROUTES.governanceBudgets]: 'Budgets',
  [ROUTES.governanceTeams]: 'Teams',
  [ROUTES.governanceRoles]: 'Roles',
  [ROUTES.guardrails]: 'Guardrails',
  [ROUTES.proposals]: 'Proposals',
  [ROUTES.proposalApprovals]: 'Approvals',
  [ROUTES.events]: 'Events',
  [ROUTES.agentPlayground]: 'Agent Playground',
  [ROUTES.agentIdentities]: 'Agent Identities',
  [ROUTES.multiAgentDemo]: 'Multi-Agent Demo',
  [ROUTES.apiMcp]: 'API & MCP',
} as const
