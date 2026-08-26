'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { NAV_SECTIONS } from './nav-config'

interface SidebarNavProps {
  collapsed?: boolean
  onNavigate?: () => void
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname()

  let itemIndex = 0

  return (
    <TooltipProvider delayDuration={0}>
      <nav
        className={cn('flex flex-col gap-5', collapsed ? 'px-2' : 'px-2.5')}
        aria-label="Sidebar"
      >
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.label ?? `section-${sectionIndex}`}>
            {/* Section label / divider */}
            {section.label !== undefined &&
              (collapsed ? (
                <div className="mx-1 mb-2 flex items-center gap-1" aria-hidden="true">
                  <div className="bg-sidebar-border/50 h-px flex-1" />
                </div>
              ) : (
                <p className="text-muted-foreground/70 mb-1.5 px-2.5 text-[10px] font-semibold tracking-[0.08em] uppercase">
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
                              'group mx-auto flex size-9 items-center justify-center rounded-lg transition-all duration-200',
                              active
                                ? 'bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 text-indigo-500 shadow-[0_0_12px_-3px_rgba(99,102,241,0.3)] dark:text-indigo-400'
                                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
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
                    className="cg-rail-item relative"
                    style={{ animationDelay: `${index * 16}ms` }}
                  >
                    {/* Active accent bar */}
                    {active && (
                      <div
                        className="absolute top-1 bottom-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-indigo-500 to-fuchsia-500"
                        aria-hidden="true"
                      />
                    )}

                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-200',
                        active
                          ? 'bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-600 dark:text-indigo-400'
                          : item.starred
                            ? 'text-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                            : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                      )}
                    >
                      <item.icon
                        className={cn(
                          'size-4 shrink-0 transition-colors duration-200',
                          active
                            ? 'text-indigo-500 dark:text-indigo-400'
                            : item.starred
                              ? 'text-foreground/50 group-hover:text-foreground/70'
                              : 'text-muted-foreground/70 group-hover:text-muted-foreground',
                        )}
                      />
                      <span className="truncate">{item.title}</span>
                      {item.badge !== undefined && (
                        <span className="text-muted-foreground/50 ml-auto text-[10px] font-medium">
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
