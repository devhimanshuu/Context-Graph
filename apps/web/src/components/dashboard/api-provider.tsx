'use client'

import * as React from 'react'
import { ApiClient } from '@/lib/api/client'
import type { AuthorizationContext, DemoBootstrap, DemoUser } from '@/lib/api/types'

const SELECTED_USER_KEY = 'contextgraph.api.user-email'

export type ApiStatus = 'booting' | 'ready' | 'error'

export interface ApiContextValue {
  status: ApiStatus
  bootstrap: DemoBootstrap | null
  users: DemoUser[]
  selectedUser: DemoUser | null
  /** The caller's compiled authorization context (Phase 5) — refetched on user switch. */
  context: AuthorizationContext | null
  client: ApiClient | null
  error: string | null
  selectUser: (user: DemoUser) => Promise<void>
  retry: () => void
}

const ApiContext = React.createContext<ApiContextValue | null>(null)

/**
 * Owns the frontend ↔ NestJS API connection for the dashboard. Flow:
 * bootstrap (public) → login as the selected seeded demo user → JWT →
 * compiled authorization context. The demo-user switcher makes the
 * permission-aware engines visible: switching user refetches the context and
 * every page that depends on it refetches its data.
 */
export function ApiProvider({ children }: { children: React.ReactNode }) {
  const clientRef = React.useRef<ApiClient | null>(null)
  const bootstrapRef = React.useRef<DemoBootstrap | null>(null)
  const [state, setState] = React.useState<{
    status: ApiStatus
    bootstrap: DemoBootstrap | null
    users: DemoUser[]
    selectedUser: DemoUser | null
    context: AuthorizationContext | null
    error: string | null
  }>({
    status: 'booting',
    bootstrap: null,
    users: [],
    selectedUser: null,
    context: null,
    error: null,
  })

  const connect = React.useCallback(
    async (client: ApiClient, bootstrap: DemoBootstrap, email?: string) => {
      const user =
        bootstrap.users.find((candidate) => candidate.email === email) ?? bootstrap.users[0]
      if (user === undefined) {
        throw new Error('Demo tenant has no active users — run `npm run db:seed`')
      }
      const login = await client.login(bootstrap.organizationId, user.email)
      client.setToken(login.accessToken)
      const context = await client.authorizationContext()
      window.localStorage.setItem(SELECTED_USER_KEY, user.email)
      clientRef.current = client
      bootstrapRef.current = bootstrap
      setState({
        status: 'ready',
        bootstrap,
        users: bootstrap.users,
        selectedUser: user,
        context,
        error: null,
      })
    },
    [],
  )

  const boot = React.useCallback(async () => {
    setState((previous) => ({ ...previous, status: 'booting', error: null }))
    try {
      const client = new ApiClient()
      const bootstrap = await client.bootstrap()
      const saved = window.localStorage.getItem(SELECTED_USER_KEY) ?? undefined
      await connect(client, bootstrap, saved)
    } catch (error) {
      setState((previous) => ({
        ...previous,
        status: 'error',
        error: error instanceof Error ? error.message : 'Could not connect to the API',
      }))
    }
  }, [connect])

  React.useEffect(() => {
    void boot()
  }, [boot])

  const selectUser = React.useCallback(
    async (user: DemoUser) => {
      const client = clientRef.current
      const bootstrap = bootstrapRef.current
      if (client === null || bootstrap === null) return
      try {
        await connect(client, bootstrap, user.email)
      } catch (error) {
        setState((previous) => ({
          ...previous,
          status: 'error',
          error: error instanceof Error ? error.message : 'Could not switch user',
        }))
      }
    },
    [connect],
  )

  const value = React.useMemo<ApiContextValue>(
    () => ({
      status: state.status,
      bootstrap: state.bootstrap,
      users: state.users,
      selectedUser: state.selectedUser,
      context: state.context,
      client: clientRef.current,
      error: state.error,
      selectUser,
      retry: () => void boot(),
    }),
    [state, selectUser, boot],
  )

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
}

export function useApi(): ApiContextValue {
  const context = React.useContext(ApiContext)
  if (context === null) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return context
}
