'use client'

import * as React from 'react'
import {
  Keyboard,
  LayoutGrid,
  Waypoints,
  Library,
  GitBranch,
  Boxes,
  ScrollText,
  BrainCircuit,
  Bot,
  FlaskConical,
  Search,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ROUTES } from '@/constants'
import type { LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// Shortcut definitions
// ---------------------------------------------------------------------------

export interface ShortcutDefinition {
  keys: string[]
  label: string
  section: string
  icon?: LucideIcon
  href?: string
  action?: string
}

const IS_MAC = typeof navigator !== 'undefined' && navigator.platform?.startsWith('Mac')

const mod = IS_MAC ? '⌘' : 'Ctrl'

export const SHORTCUTS: readonly ShortcutDefinition[] = [
  // Navigation
  { keys: [mod, 'K'], label: 'Command palette', section: 'Navigation', icon: Search },
  {
    keys: [mod, '1'],
    label: 'Overview',
    section: 'Navigation',
    icon: LayoutGrid,
    href: ROUTES.dashboard,
  },
  {
    keys: [mod, '2'],
    label: 'Knowledge Graph',
    section: 'Navigation',
    icon: Waypoints,
    href: ROUTES.knowledgeGraph,
  },
  {
    keys: [mod, '3'],
    label: 'Knowledge',
    section: 'Navigation',
    icon: Library,
    href: ROUTES.knowledge,
  },
  {
    keys: [mod, '4'],
    label: 'Pipeline',
    section: 'Navigation',
    icon: GitBranch,
    href: ROUTES.pipeline,
  },
  {
    keys: [mod, '5'],
    label: 'Contexts',
    section: 'Navigation',
    icon: Boxes,
    href: ROUTES.contexts,
  },
  { keys: [mod, '6'], label: 'Rules', section: 'Navigation', icon: ScrollText, href: ROUTES.rules },
  {
    keys: [mod, '7'],
    label: 'AI Chat',
    section: 'Navigation',
    icon: BrainCircuit,
    href: ROUTES.ai,
  },
  { keys: [mod, '8'], label: 'Agents', section: 'Navigation', icon: Bot, href: ROUTES.agents },
  {
    keys: [mod, '9'],
    label: 'Evaluation',
    section: 'Navigation',
    icon: FlaskConical,
    href: ROUTES.evaluation,
  },

  // Actions
  {
    keys: [mod, 'Shift', 'N'],
    label: 'Create knowledge node',
    section: 'Actions',
    action: 'app:create-node',
  },
  {
    keys: [mod, 'Shift', 'P'],
    label: 'Run pipeline',
    section: 'Actions',
    action: 'app:run-pipeline',
  },
  { keys: [mod, 'Shift', '/'], label: 'Keyboard shortcuts', section: 'Actions', icon: Keyboard },
]

// ---------------------------------------------------------------------------
// Format shortcut keys for display
// ---------------------------------------------------------------------------
export function formatShortcut(keys: string[]): string {
  return keys.join('+')
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts help dialog
// ---------------------------------------------------------------------------
export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const sections = React.useMemo(() => {
    const grouped: Record<string, ShortcutDefinition[]> = {}
    for (const shortcut of SHORTCUTS) {
      if (grouped[shortcut.section] === undefined) {
        grouped[shortcut.section] = []
      }
      grouped[shortcut.section]!.push(shortcut)
    }
    return grouped
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate and take actions from anywhere in the dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section}>
              <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                {section}
              </h3>
              <div className="space-y-1">
                {items.map((shortcut) => (
                  <div
                    key={shortcut.label}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {shortcut.icon !== undefined && (
                        <shortcut.icon className="text-muted-foreground size-3.5" />
                      )}
                      <span>{shortcut.label}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {shortcut.keys.map((key, index) => (
                        <React.Fragment key={`${key}-${index}`}>
                          <kbd className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-mono text-[10px] font-medium">
                            {key}
                          </kbd>
                          {index < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground/40 text-[10px]">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Global keyboard shortcut listener hook
// ---------------------------------------------------------------------------
export function useGlobalShortcuts() {
  const [helpOpen, setHelpOpen] = React.useState(false)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      // Don't intercept shortcuts when typing in inputs/textareas/selects
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      const modKey = IS_MAC ? event.metaKey : event.ctrlKey
      if (!modKey) return

      // Number shortcuts: ⌘1–⌘9
      const num = parseInt(event.key, 10)
      if (num >= 1 && num <= 9 && !event.shiftKey && !event.altKey) {
        const shortcut = SHORTCUTS.find(
          (s) => s.href !== undefined && s.keys.length === 2 && s.keys[1] === String(num),
        )
        if (shortcut?.href !== undefined) {
          event.preventDefault()
          window.location.href = shortcut.href
          return
        }
      }

      // ⌘K — already handled by CommandMenu, but prevent double-registration
      if (event.key === 'k' && !event.shiftKey) {
        // CommandMenu handles this
        return
      }

      // ⌘Shift+N — Create knowledge node
      if (event.key === 'N' && event.shiftKey && !event.altKey) {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('app:create-node'))
        return
      }

      // ⌘Shift+P — Run pipeline
      if (event.key === 'P' && event.shiftKey && !event.altKey) {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('app:run-pipeline'))
        return
      }

      // ⌘Shift+/ — Keyboard shortcuts help
      if (event.key === '?' && event.shiftKey && !event.altKey) {
        event.preventDefault()
        setHelpOpen((prev) => !prev)
        return
      }
    }

    // Listen for custom event from command palette
    const onShowShortcuts = () => setHelpOpen(true)
    window.addEventListener('app:show-shortcuts', onShowShortcuts)

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('app:show-shortcuts', onShowShortcuts)
    }
  }, [])

  return { helpOpen, setHelpOpen }
}
