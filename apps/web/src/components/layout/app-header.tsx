'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SessionUser } from '@/lib/auth/types'
import { Breadcrumbs } from './breadcrumbs'
import { CommandMenu } from './command-menu'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'
import { useSidebar } from './sidebar-context'

/* Sticky application header. Left: mobile hamburger + breadcrumbs. Right: command palette, theme toggle */
export function AppHeader({ user }: { user: SessionUser }) {
  const { setOpen } = useSidebar()

  return (
    <header className="bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </Button>

      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-1">
        <CommandMenu />
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  )
}
