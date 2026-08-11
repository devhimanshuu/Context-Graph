'use client'

import { Circle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApi } from './api-provider'

/**
 * Slim connection strip above the dashboard content. The demo-user switcher
 * lives in the header (DemoUserSwitcher) — this bar only reports the live
 * state of the NestJS API and offers a retry on failure.
 */
export function ApiStatusBar() {
  const { status, bootstrap, error, retry } = useApi()

  if (status === 'booting') {
    return (
      <div className="bg-muted/40 border-b px-4 py-1.5 md:px-6 lg:px-8">
        <div className="text-muted-foreground mx-auto flex max-w-7xl items-center gap-2 text-xs">
          <Circle className="size-3 animate-pulse" />
          Connecting to the ContextGraph API…
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="bg-destructive/5 border-b px-4 py-1.5 md:px-6 lg:px-8">
        <div className="text-destructive mx-auto flex max-w-7xl items-center gap-2 text-xs">
          <Circle className="size-3" />
          <span className="truncate">API unavailable — {error}</span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={retry}>
            <RefreshCw /> Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-muted/40 border-b px-4 py-1.5 md:px-6 lg:px-8">
      <div className="text-muted-foreground mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <Circle className="size-2.5 fill-emerald-500 text-emerald-500" />
          Connected to {bootstrap?.organizationName ?? 'ContextGraph'} API
        </span>
        <span className="ml-auto hidden md:inline">Workspace: {bootstrap?.workspaceName}</span>
      </div>
    </div>
  )
}
