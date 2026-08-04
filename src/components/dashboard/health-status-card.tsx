'use client'

import * as React from 'react'
import { Activity, CircleCheck, CircleX, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ApiEnvelope, ApiErrorEnvelope, HealthStatusDto } from '@/dto'

type HealthState =
  | { status: 'loading' }
  | { status: 'ok'; data: HealthStatusDto }
  | { status: 'error'; message: string }

/**
 * Live status of the infrastructure health endpoint.
 *
 * Demonstrates the API layer end-to-end: this card calls `GET /api/health`
 * and renders the standardized envelope. It is infrastructure, not business
 * logic — a placeholder that disappears when real platform metrics land.
 */
export function HealthStatusCard() {
  const [state, setState] = React.useState<HealthState>({ status: 'loading' })

  const check = React.useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const response = await fetch('/api/health', { cache: 'no-store' })
      const body = (await response.json()) as ApiEnvelope<HealthStatusDto> | ApiErrorEnvelope

      if (!response.ok) {
        setState({ status: 'error', message: (body as ApiErrorEnvelope).error.message })
        return
      }

      setState({ status: 'ok', data: (body as ApiEnvelope<HealthStatusDto>).data })
    } catch {
      setState({ status: 'error', message: 'Could not reach the API' })
    }
  }, [])

  React.useEffect(() => {
    void check()
  }, [check])

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">API Health</CardTitle>
          <CardDescription>Infrastructure endpoint status</CardDescription>
        </div>
        <Activity className="text-muted-foreground size-4 shrink-0" />
      </CardHeader>
      <CardContent>
        {state.status === 'loading' && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Skeleton className="size-4 rounded-full" />
            Checking…
          </div>
        )}

        {state.status === 'ok' && (
          <div className="flex items-center gap-2 text-sm">
            <CircleCheck className="size-4 shrink-0 text-emerald-500" />
            <span>All systems operational</span>
            <span className="text-muted-foreground ml-auto text-xs">
              v{state.data.version} · {state.data.uptimeSeconds}s up
            </span>
          </div>
        )}

        {state.status === 'error' && (
          <div className="text-destructive flex items-center gap-2 text-sm">
            <CircleX className="size-4 shrink-0" />
            <span className="truncate">{state.message}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-auto shrink-0"
              onClick={() => void check()}
              aria-label="Retry health check"
            >
              <RefreshCw />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
