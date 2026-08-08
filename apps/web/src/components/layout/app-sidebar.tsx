'use client'

import { APP, ROUTES } from '@/constants'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AppLogo } from './app-logo'
import { SidebarNav } from './sidebar-nav'
import { useSidebar } from './sidebar-context'

/* Application sidebar. - Desktop: fixed-width aside, visible from `lg` up. */
export function AppSidebar() {
  const { open, setOpen } = useSidebar()

  return (
    <>
      <aside className="bg-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r lg:flex">
        <SidebarBody />
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
  onNavigate?: () => void
}

function SidebarBody({ onNavigate }: SidebarBodyProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <AppLogo href={ROUTES.dashboard} />
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav onNavigate={onNavigate} />
      </div>

      <div className="shrink-0 border-t p-3">
        <div className="bg-card/50 flex items-center justify-between rounded-lg border px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium">Platform</span>
            <span className="text-muted-foreground text-[10px]">v{APP.version}</span>
          </div>
          <span className="bg-sidebar-accent text-sidebar-accent-foreground rounded-md px-1.5 py-0.5 text-[10px] font-medium">
            Phase 2
          </span>
        </div>
      </div>
    </div>
  )
}
