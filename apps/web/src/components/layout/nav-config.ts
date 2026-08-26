import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Boxes,
  Building2,
  BrainCircuit,
  FileClock,
  FileUp,
  GitBranch,
  Landmark,
  LayoutGrid,
  Library,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  FlaskConical,
  Users,
  Waypoints,
  Bot,
  Scale,
  Cpu,
  DollarSign,
  UserCog,
  Shield,
  ShieldAlert,
  FileText,
} from 'lucide-react'
import { ROUTES } from '@/constants'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  /** Short label shown for capabilities that ship in later phases. */
  badge?: string
  /** Starred items get visual emphasis in the sidebar. */
  starred?: boolean
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    items: [{ title: 'Overview', href: ROUTES.dashboard, icon: LayoutGrid }],
  },
  {
    label: 'Intelligence',
    items: [
      {
        title: 'Knowledge Graph',
        href: ROUTES.knowledgeGraph,
        icon: Waypoints,
        starred: true,
      },
      { title: 'Knowledge', href: ROUTES.knowledge, icon: Library, starred: true },
      { title: 'Ingestion', href: ROUTES.ingestion, icon: FileUp },
      {
        title: 'Pipeline',
        href: ROUTES.pipeline,
        icon: GitBranch,
        starred: true,
      },
      { title: 'Contexts', href: ROUTES.contexts, icon: Boxes },
      { title: 'Retrieval', href: ROUTES.retrieval, icon: Search },
      {
        title: 'AI Chat',
        href: ROUTES.ai,
        icon: BrainCircuit,
        starred: true,
      },
    ],
  },
  {
    label: 'Governance',
    items: [
      { title: 'Governance', href: ROUTES.governance, icon: Scale, starred: true },
      { title: 'Policies', href: ROUTES.governancePolicies, icon: Shield },
      { title: 'Models', href: ROUTES.governanceModels, icon: Cpu },
      { title: 'Budgets', href: ROUTES.governanceBudgets, icon: DollarSign },
      { title: 'Teams', href: ROUTES.governanceTeams, icon: UserCog },
      { title: 'Roles', href: ROUTES.governanceRoles, icon: ShieldCheck },
      { title: 'Rules', href: ROUTES.rules, icon: ScrollText },
      { title: 'Permissions', href: ROUTES.permissions, icon: ShieldCheck },
      { title: 'Evaluation', href: ROUTES.evaluation, icon: FlaskConical },
      { title: 'Guardrails', href: ROUTES.guardrails, icon: ShieldAlert, starred: true },
      { title: 'Proposals', href: ROUTES.proposals, icon: FileText },
      { title: 'Approvals', href: ROUTES.proposalApprovals, icon: ShieldCheck },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        title: 'Agents',
        href: ROUTES.agents,
        icon: Bot,
        starred: true,
      },
      { title: 'Audit', href: ROUTES.audit, icon: FileClock },
      { title: 'Users', href: ROUTES.users, icon: Users },
      { title: 'Departments', href: ROUTES.departments, icon: Building2 },
      {
        title: 'Organization',
        href: ROUTES.organizations,
        icon: Landmark,
      },
      { title: 'Analytics', href: ROUTES.analytics, icon: BarChart3 },
      { title: 'Configuration', href: ROUTES.configuration, icon: SlidersHorizontal },
    ],
  },
  {
    items: [{ title: 'Settings', href: ROUTES.settings, icon: Settings }],
  },
]
