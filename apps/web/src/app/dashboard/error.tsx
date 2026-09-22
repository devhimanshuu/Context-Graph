'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface SectionErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Per-section error boundary. Next.js picks this up from any dashboard
 * segment, so a crash in e.g. the knowledge-graph view no longer takes down
 * the whole dashboard shell — the sidebar and navigation stay interactive.
 */
export default function DashboardSectionError({ error, reset }: SectionErrorProps) {
  React.useEffect(() => {
    console.error('[dashboard section]', error)
  }, [error])

  return (
    <div className="flex min-h-[50svh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-muted-foreground text-sm font-medium">Section error</p>
      <h1 className="text-xl font-semibold tracking-tight">This panel failed to load</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        {error.message || 'An unexpected error occurred in this section.'} The rest of the dashboard
        is still available.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} size="sm">
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Try again
        </Button>
      </div>
    </div>
  )
}
