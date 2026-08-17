'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * TanStack Query client for the dashboard. Conservative defaults: 30s stale time
 * (permission-aware data refetches explicitly on user switch via the query key),
 * a single retry, and no refetch-on-window-focus (avoids surprise calls while the
 * demo is being explored). The client is created once per mount.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
