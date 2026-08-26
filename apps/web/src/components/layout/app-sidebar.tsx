'use client'

import { ChevronsLeft, ChevronsRight, Waypoints } from 'lucide-react'
import { APP, ROUTES } from '@/constants'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useSpringValue } from '@/hooks/use-spring'
import { cn } from '@/lib/utils'
import { AppLogo } from './app-logo'
import { SidebarNav } from './sidebar-nav'
import { useSidebar } from './sidebar-context'

const COLLAPSED_WIDTH = 72
const EXPANDED_WIDTH = 260

/**
 * Premium application sidebar.
 * - Desktop: sticky, in-flow rail with subtle depth, gradient overlay,
 *   and smooth spring-animated collapse. Linear/Vercel quality.
 * - Mobile: slide-in sheet triggered from the header.
 */
export function AppSidebar() {
  const { open, setOpen, collapsed } = useSidebar()
  const width = useSpringValue(collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH)

  return (
    <>
      <aside
        data-collapsed={collapsed}
        style={{ width }}
        className={cn(
          'sidebar-shell sticky top-0 z-30 hidden h-svh shrink-0 flex-col will-change-[width] lg:flex',
        )}
      >
        <SidebarBody collapsed={collapsed} />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="sidebar-shell gap-0 p-0 sm:max-w-72"
        >
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}

interface SidebarBodyProps {
  collapsed?: boolean
  onNavigate?: () => void
}

function SidebarBody({ collapsed = false, onNavigate }: SidebarBodyProps) {
  const { toggleCollapsed } = useSidebar()

  return (
    <div className="relative flex h-full flex-col">
      {/* Subtle gradient overlay for depth */}
      <div
        className="from-sidebar-primary/[0.03] pointer-events-none absolute inset-0 bg-gradient-to-b via-transparent to-transparent"
        aria-hidden="true"
      />

      {/* Logo area */}
      <div className="border-sidebar-border/60 relative flex h-14 shrink-0 items-center border-b px-4">
        {collapsed ? (
          <div
            className="motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in mx-auto flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-sky-500 to-fuchsia-500 shadow-[0_2px_12px_-2px_rgba(99,102,241,0.4)] motion-safe:duration-300"
            aria-label="ContextGraph"
          >
            <Waypoints className="size-4 text-white" />
          </div>
        ) : (
          <AppLogo href={ROUTES.dashboard} />
        )}
      </div>

      {/* Navigation */}
      <div className="relative flex-1 overflow-y-auto py-3">
        <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      {/* Footer */}
      <div className="border-sidebar-border/60 relative shrink-0 border-t p-2.5">
        {/* Workspace badge */}
        {!collapsed && (
          <div className="border-sidebar-border/40 bg-sidebar-accent/40 mb-2 flex items-center gap-2.5 rounded-lg border px-3 py-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20">
              <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400">A</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">Acme Engineering</p>
              <p className="text-muted-foreground truncate text-[10px]">Free tier</p>
            </div>
          </div>
        )}

        {/* Version + status */}
        <div
          className={cn(
            'border-sidebar-border/40 flex items-center rounded-lg border px-3 py-2',
            collapsed ? 'justify-center px-0' : 'justify-between',
          )}
        >
          <div
            className={cn(
              'flex flex-col gap-0.5 transition-opacity duration-200',
              collapsed && 'hidden',
            )}
          >
            <span className="text-xs font-medium">{APP.name}</span>
            <span className="text-muted-foreground text-[10px]">v{APP.version}</span>
          </div>
          {!collapsed && (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex size-1" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground mt-1.5 flex h-8 w-full items-center rounded-md transition-all duration-200',
            collapsed ? 'justify-center' : 'justify-between px-3',
          )}
        >
          {collapsed ? (
            <ChevronsRight className="size-3.5" />
          ) : (
            <>
              <span className="text-[11px] font-medium">Collapse</span>
              <ChevronsLeft className="size-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
