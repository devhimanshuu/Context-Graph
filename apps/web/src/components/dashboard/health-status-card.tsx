'use client'

import * as React from 'react'
import { Activity, CircleCheck, CircleX, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/* Shape of the NestJS liveness response wrapped in the platform envelope: */
interface HealthEnvelope {
  success: boolean
  data?: {
    status: string
    uptime?: number
    timestamp?: string
  }
  /** NestJS error envelope: `{ success: false, error: { code, message } }`. */
  error?: { code?: string; message?: string }
}

type HealthState =
  { status: 'loading' } | { status: 'ok'; uptime: number } | { status: 'error'; message: string }

/** Base URL of the NestJS API (`/api/v1`); override via NEXT_PUBLIC_API_URL. */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

/* Live status of the NestJS API health endpoint. Demonstrates the frontend ↔ NestJS connection end-to-end: this card calls */
export function HealthStatusCard() {
  const [state, setState] = React.useState<HealthState>({ status: 'loading' })

  const check = React.useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const response = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' })
      const body = (await response.json()) as HealthEnvelope

      if (!response.ok || !body.success || body.data?.status !== 'ok') {
        setState({
          status: 'error',
          message: body.error?.message ?? 'API reported an unhealthy state',
        })
        return
      }

      setState({ status: 'ok', uptime: body.data.uptime ?? 0 })
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
          <CardDescription>NestJS infrastructure endpoint status</CardDescription>
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
              {Math.round(state.uptime)}s up
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
