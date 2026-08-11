'use client'

import * as React from 'react'

/** localStorage key for the desktop collapse preference. */
const COLLAPSED_STORAGE_KEY = 'contextgraph.sidebar.collapsed'

interface SidebarContextValue {
  /** Whether the mobile sidebar sheet is open. */
  open: boolean
  setOpen: (open: boolean) => void
  /** Whether the desktop sidebar is collapsed to the icon rail. */
  collapsed: boolean
  toggleCollapsed: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

/* Shares the sidebar state: mobile sheet visibility + the desktop collapse preference (persisted across reloads). */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState(false)

  // Hydrate the persisted preference once mounted (localStorage is client-only).
  React.useEffect(() => {
    if (window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1') {
      setCollapsed(true)
    }
  }, [])

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((current) => {
      const next = !current
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  return (
    <SidebarContext.Provider value={{ open, setOpen, collapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext)
  if (context === null) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
