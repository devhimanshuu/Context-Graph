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
const EXPANDED_WIDTH = 256

/**
 * Application sidebar.
 * - Desktop: sticky, in-flow rail that collapses to an icon-only width
 *   (72px) with a smooth transition — Linear/Vercel style. The preference
 *   persists across reloads.
 * - Mobile: slide-in sheet triggered from the header.
 */
export function AppSidebar() {
  const { open, setOpen, collapsed } = useSidebar()
  // Spring-animated width — retargeting mid-flight continues from the current
  // position, giving the rail a premium damped feel instead of a linear ease.
  const width = useSpringValue(collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH)

  return (
    <>
      <aside
        data-collapsed={collapsed}
        style={{ width }}
        className={cn(
          'bg-sidebar sticky top-0 z-30 hidden h-svh shrink-0 flex-col border-r will-change-[width] lg:flex',
        )}
      >
        <SidebarBody collapsed={collapsed} />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="bg-sidebar gap-0 p-0 sm:max-w-72"
        >
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}

interface SidebarBodyProps {
  /** Collapsed (desktop rail) — the mobile sheet always renders expanded. */
  collapsed?: boolean
  onNavigate?: () => void
}

function SidebarBody({ collapsed = false, onNavigate }: SidebarBodyProps) {
  const { toggleCollapsed } = useSidebar()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        {collapsed ? (
          <div
            className="motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in mx-auto flex size-8 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 shadow-sm motion-safe:duration-300"
            aria-label="ContextGraph"
          >
            <Waypoints className="size-4 text-white" />
          </div>
        ) : (
          <AppLogo href={ROUTES.dashboard} />
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      <div className="shrink-0 space-y-1.5 border-t p-2.5">
        <div
          className={cn(
            'flex items-center rounded-lg border px-3 py-2',
            collapsed ? 'justify-center px-0' : 'justify-between',
          )}
        >
          <div
            className={cn(
              'flex flex-col gap-0.5 transition-opacity duration-200',
              collapsed && 'hidden',
            )}
          >
            <span className="text-xs font-medium">Platform</span>
            <span className="text-muted-foreground text-[10px]">v{APP.version}</span>
          </div>
          {!collapsed && (
            <span className="bg-sidebar-accent text-sidebar-accent-foreground rounded-md px-1.5 py-0.5 text-[10px] font-medium">
              Live
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground flex h-9 w-full items-center rounded-md transition-colors',
            collapsed ? 'justify-center' : 'justify-between px-3',
          )}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <>
              <span className="text-xs font-medium">Collapse</span>
              <ChevronsLeft className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
