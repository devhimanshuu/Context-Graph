'use client'

import * as React from 'react'
import { useApi } from '@/components/dashboard/api-provider'
import type { ApiClient } from '@/lib/api/client'

interface ApiDataState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Fetches API data when the connection is ready and refetches whenever the
 * selected demo user changes — so permission-aware results stay in sync with
 * the authorization context shown in the status bar.
 */
export function useApiData<T>(
  fetcher: (client: ApiClient) => Promise<T>,
  deps: React.DependencyList = [],
): ApiDataState<T> {
  const { status, client, selectedUser } = useApi()
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)

  const reload = React.useCallback(() => setTick((value) => value + 1), [])

  React.useEffect(() => {
    if (status !== 'ready' || client === null) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetcher(client)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Request failed')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, client, selectedUser?.id, tick, ...deps])

  return { data, loading, error, reload }
}
