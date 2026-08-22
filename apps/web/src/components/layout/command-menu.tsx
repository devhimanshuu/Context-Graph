'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Settings,
  Plus,
  GitBranch,
  BrainCircuit,
  FlaskConical,
  Keyboard,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { ROUTES } from '@/constants'
import { useIsMobile } from '@/hooks'
import { NAV_SECTIONS } from './nav-config'
import { useSidebar } from './sidebar-context'

/* ---------------------------------------------------------------------------
 * Command palette (`⌘K` / `Ctrl+K`). Enhanced with:
 * - Quick page navigation with shortcut hints
 * - Actions: create node, run pipeline, new AI chat, start evaluation
 * - Theme toggle, sidebar toggle, keyboard shortcuts help
 * --------------------------------------------------------------------------- */

interface CommandMenuProps {
  /** Called when "Keyboard shortcuts" is selected — opens the help dialog. */
  onOpenShortcuts?: () => void
}

export function CommandMenu({ onOpenShortcuts }: CommandMenuProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const isMobile = useIsMobile()
  const { theme, setTheme } = useTheme()
  const { collapsed, toggleCollapsed } = useSidebar()

  const isDark = theme === 'dark'

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const runNavigation = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const runAction = (action: () => void) => {
    setOpen(false)
    action()
  }

  const IS_MAC = typeof navigator !== 'undefined' && navigator.platform?.startsWith('Mac')
  const mod = IS_MAC ? '⌘' : 'Ctrl'

  return (
    <>
      {isMobile ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Search"
          className="md:hidden"
        >
          <Search className="size-[18px]" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground hidden h-8 w-48 justify-start gap-2 md:inline-flex lg:w-60"
          onClick={() => setOpen(true)}
        >
          <Search className="size-3.5" />
          <span>Search…</span>
          <kbd className="bg-muted text-muted-foreground pointer-events-none ml-auto inline-flex h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium">
            {mod}K
          </kbd>
        </Button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, actions, and shortcuts…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Pages */}
          {NAV_SECTIONS.map((section) => (
            <CommandGroup key={section.label ?? 'main'} heading={section.label ?? 'Pages'}>
              {section.items.map((item) => {
                // Find the shortcut number for this route
                const shortcutNum = getShortcutNumber(item.href)
                return (
                  <CommandItem key={item.href} onSelect={() => runNavigation(item.href)}>
                    <item.icon />
                    <span>{item.title}</span>
                    {item.badge !== undefined && (
                      <span className="text-muted-foreground ml-1 text-[10px]">{item.badge}</span>
                    )}
                    {shortcutNum !== null && (
                      <CommandShortcut>
                        {mod}
                        {shortcutNum}
                      </CommandShortcut>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}

          <CommandSeparator />

          {/* Quick actions */}
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() =>
                runAction(() => {
                  window.dispatchEvent(new CustomEvent('app:create-node'))
                  router.push(ROUTES.knowledge)
                })
              }
            >
              <Plus />
              <span>Create knowledge node</span>
              <CommandShortcut>{mod}Shift+N</CommandShortcut>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runAction(() => {
                  window.dispatchEvent(new CustomEvent('app:run-pipeline'))
                  router.push(ROUTES.pipeline)
                })
              }
            >
              <GitBranch />
              <span>Run pipeline</span>
              <CommandShortcut>{mod}Shift+P</CommandShortcut>
            </CommandItem>

            <CommandItem onSelect={() => runNavigation(ROUTES.ai)}>
              <BrainCircuit />
              <span>New AI chat</span>
              <CommandShortcut>{mod}7</CommandShortcut>
            </CommandItem>

            <CommandItem onSelect={() => runNavigation(ROUTES.evaluation)}>
              <FlaskConical />
              <span>Start evaluation</span>
              <CommandShortcut>{mod}9</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Workspace */}
          <CommandGroup heading="Workspace">
            <CommandItem onSelect={() => runAction(() => setTheme(isDark ? 'light' : 'dark'))}>
              {isDark ? <Sun /> : <Moon />}
              <span>{isDark ? 'Switch to light theme' : 'Switch to dark theme'}</span>
            </CommandItem>

            <CommandItem onSelect={() => runAction(toggleCollapsed)}>
              {collapsed ? <PanelLeft /> : <PanelLeftClose />}
              <span>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
            </CommandItem>

            <CommandItem onSelect={() => runNavigation(ROUTES.settings)}>
              <Settings />
              <span>Open settings</span>
              <CommandShortcut>{mod},</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Help */}
          <CommandGroup heading="Help">
            <CommandItem
              onSelect={() =>
                runAction(() => {
                  if (onOpenShortcuts !== undefined) {
                    onOpenShortcuts()
                  } else {
                    // Fallback: dispatch event for the global listener
                    window.dispatchEvent(new CustomEvent('app:show-shortcuts'))
                  }
                })
              }
            >
              <Keyboard />
              <span>Keyboard shortcuts</span>
              <CommandShortcut>{mod}Shift+/</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Map route to shortcut number
// ---------------------------------------------------------------------------
const ROUTE_SHORTCUT_MAP: Record<string, string> = {
  [ROUTES.dashboard]: '1',
  [ROUTES.knowledgeGraph]: '2',
  [ROUTES.knowledge]: '3',
  [ROUTES.pipeline]: '4',
  [ROUTES.contexts]: '5',
  [ROUTES.rules]: '6',
  [ROUTES.ai]: '7',
  [ROUTES.agents]: '8',
  [ROUTES.evaluation]: '9',
}

function getShortcutNumber(href: string): string | null {
  return ROUTE_SHORTCUT_MAP[href] ?? null
}
