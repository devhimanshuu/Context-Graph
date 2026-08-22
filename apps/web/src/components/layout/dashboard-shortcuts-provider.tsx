'use client'

import * as React from 'react'
import { useGlobalShortcuts, KeyboardShortcutsHelp } from './keyboard-shortcuts'

/* Wraps the dashboard shell with the global keyboard shortcuts listener
   and the keyboard shortcuts help dialog. This must be a client component
   because it uses event listeners and React state. */
export function DashboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const { helpOpen, setHelpOpen } = useGlobalShortcuts()

  return (
    <>
      {children}
      <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}
