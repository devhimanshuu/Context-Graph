'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV_SECTIONS } from './nav-config'

interface SidebarNavProps {
  /** Called after a navigation happens (used to close the mobile sheet). */
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-6 px-3" aria-label="Sidebar">
      {NAV_SECTIONS.map((section, sectionIndex) => (
        <div key={section.label ?? `section-${sectionIndex}`}>
          {section.label !== undefined && (
            <p className="text-muted-foreground mb-1.5 px-2 text-[11px] font-medium tracking-wider uppercase">
              {section.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                    {item.badge !== undefined && (
                      <span className="text-muted-foreground/70 ml-auto text-[10px] font-medium">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
