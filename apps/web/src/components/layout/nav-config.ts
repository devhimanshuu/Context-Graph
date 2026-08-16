import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Boxes,
  Building2,
  FileClock,
  GitBranch,
  LayoutGrid,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Waypoints,
} from 'lucide-react'
import { ROUTES } from '@/constants'

/* Shared navigation configuration. Single source of truth for sidebar and command-palette navigation. Adding a */
export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  /** Short label shown for capabilities that ship in later phases. */
  badge?: string
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
        badge: 'Live',
      },
      { title: 'Pipeline', href: ROUTES.pipeline, icon: GitBranch, badge: 'Live' },
      { title: 'Contexts', href: ROUTES.contexts, icon: Boxes, badge: 'Phase 7' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { title: 'Rules', href: ROUTES.rules, icon: ScrollText, badge: 'Live' },
      { title: 'Permissions', href: ROUTES.permissions, icon: ShieldCheck, badge: 'Live' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { title: 'Audit', href: ROUTES.audit, icon: FileClock, badge: 'Live' },
      { title: 'Users', href: ROUTES.users, icon: Users, badge: 'Live' },
      { title: 'Departments', href: ROUTES.departments, icon: Building2, badge: 'Live' },
      { title: 'Analytics', href: ROUTES.analytics, icon: BarChart3, badge: 'Live' },
      {
        title: 'Configuration',
        href: ROUTES.configuration,
        icon: SlidersHorizontal,
        badge: 'Live',
      },
    ],
  },
  {
    items: [{ title: 'Settings', href: ROUTES.settings, icon: Settings }],
  },
]
