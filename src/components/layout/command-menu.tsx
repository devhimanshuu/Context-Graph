'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { ROUTES } from '@/constants'
import { useIsMobile } from '@/hooks'
import { NAV_SECTIONS } from './nav-config'

/**
 * Command palette (`⌘K` / `Ctrl+K`).
 *
 * Linear/Vercel-style quick navigation across the workspace. Opens on keyboard
 * shortcut or by clicking the search trigger in the header.
 */
export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const isMobile = useIsMobile()

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

  const runAction = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      {isMobile ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Search"
          // Matches the JS breakpoint (<768px); previously `sm:hidden` left a
          // dead range at 640-767px where neither trigger rendered.
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
            ⌘K
          </kbd>
        </Button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages and actions…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {NAV_SECTIONS.map((section) => (
            <CommandGroup key={section.label ?? 'main'} heading={section.label}>
              {section.items.map((item) => (
                <CommandItem key={item.href} onSelect={() => runAction(item.href)}>
                  <item.icon />
                  <span>{item.title}</span>
                  {item.badge !== undefined && (
                    <span className="text-muted-foreground ml-auto text-[10px]">{item.badge}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => runAction(ROUTES.settings)}>
              <Settings />
              <span>Open settings</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
