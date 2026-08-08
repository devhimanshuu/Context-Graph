'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/* Global error boundary. Rendered when a server or client component throws. `reset` re-renders the */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  React.useEffect(() => {
    // Phase 2: forward `error.digest` to Sentry/Datadog here.
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-muted-foreground text-sm font-medium">500</p>
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        An unexpected error occurred. Your workspace data is safe — try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
