'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Terminal, RefreshCw } from 'lucide-react'

interface PlaygroundErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/** Dedicated error boundary for the agent playground. */
export default function AgentPlaygroundError({ error, reset }: PlaygroundErrorProps) {
  React.useEffect(() => {
    console.error('[agent-playground]', error)
  }, [error])

  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15">
        <Terminal className="h-6 w-6 text-indigo-500" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Playground crashed</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        {error.message || 'The agent playground hit an unexpected error.'} Reset the panel and try
        again.
      </p>
      <Button onClick={reset} size="sm">
        <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry
      </Button>
    </div>
  )
}
