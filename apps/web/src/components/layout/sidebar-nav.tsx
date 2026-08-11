'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { NAV_SECTIONS } from './nav-config'

interface SidebarNavProps {
  /** Collapsed (desktop rail): icons only, centered, with tooltips. */
  collapsed?: boolean
  /** Called after a navigation happens (used to close the mobile sheet). */
  onNavigate?: () => void
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname()

  // Running index across ALL items (not per section) so the stagger reads as
  // one continuous top-to-bottom cascade when the rail collapses/expands.
  let itemIndex = 0

  return (
    <TooltipProvider delayDuration={0}>
      <nav className={cn('flex flex-col gap-6', collapsed ? 'px-2' : 'px-3')} aria-label="Sidebar">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.label ?? `section-${sectionIndex}`}>
            {section.label !== undefined &&
              (collapsed ? (
                <div className="bg-border mx-1 mb-2 h-px" aria-hidden="true" />
              ) : (
                <p className="text-muted-foreground mb-1.5 px-2 text-[11px] font-medium tracking-wider uppercase">
                  {section.label}
                </p>
              ))}

            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href
                const index = itemIndex
                itemIndex += 1

                if (collapsed) {
                  return (
                    <li
                      key={item.href}
                      className="cg-rail-item"
                      style={{ animationDelay: `${index * 24}ms` }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            aria-current={active ? 'page' : undefined}
                            aria-label={item.title}
                            className={cn(
                              'group mx-auto flex size-9 items-center justify-center rounded-md transition-colors',
                              active
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                            )}
                          >
                            <item.icon className="size-4 shrink-0" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10}>
                          <span>{item.title}</span>
                          {item.badge !== undefined && (
                            <span className="text-muted-foreground ml-1.5 text-[10px] font-normal">
                              {item.badge}
                            </span>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  )
                }

                return (
                  <li
                    key={item.href}
                    className="cg-rail-item"
                    style={{ animationDelay: `${index * 16}ms` }}
                  >
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
    </TooltipProvider>
  )
}
