import type { LucideIcon } from 'lucide-react'
import { Boxes, LayoutGrid, ScrollText, Settings, ShieldCheck, Waypoints } from 'lucide-react'
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
    items: [{ title: 'Settings', href: ROUTES.settings, icon: Settings }],
  },
]
