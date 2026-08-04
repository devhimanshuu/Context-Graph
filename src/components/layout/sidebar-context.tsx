'use client'

import * as React from 'react'

interface SidebarContextValue {
  /** Whether the mobile sidebar sheet is open. */
  open: boolean
  setOpen: (open: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

/**
 * Shares the mobile sidebar visibility between the header hamburger trigger
 * and the sheet rendered by `AppSidebar`. Desktop sidebar is pure CSS.
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  return <SidebarContext.Provider value={{ open, setOpen }}>{children}</SidebarContext.Provider>
}

export function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext)
  if (context === null) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
