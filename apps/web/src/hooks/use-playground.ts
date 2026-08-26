'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useApi } from '@/components/dashboard/api-provider'
import type {
  McpConnectionStatus,
  McpSessionInfo,
  McpToolInfo,
  PlaygroundEvent,
  ActivityEntry as ActivityEntryType,
  ResolveContextResult,
  CheckActionResult,
  ProposeNodeResult,
  SubgraphResult,
  PipelineRunDetail,
} from '@/lib/api/playground-types'

// Re-export so panel components can import from here
export type { ActivityEntryType as ActivityEntry }

// ── SSE Event Stream Hook ───────────────────────────────────────────────

export function usePlaygroundEvents() {
  const { status: apiStatus } = useApi()
  const [events, setEvents] = useState<PlaygroundEvent[]>([])
  const [sseStatus, setSseStatus] = useState<McpConnectionStatus>('disconnected')
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (apiStatus !== 'ready') return

    const connect = () => {
      setSseStatus('connecting')
      const es = new EventSource('/api/v1/events/stream')
      eventSourceRef.current = es

      es.onopen = () => setSseStatus('connected')
      es.onerror = () => setSseStatus('error')

      const eventTypes = [
        'NODE_PUBLISHED',
        'NODE_PROPOSED',
        'NODE_APPROVED',
        'NODE_REJECTED',
        'PIPELINE_COMPLETED',
        'PIPELINE_FAILED',
        'ACTION_CHECKED',
        'ACTION_BLOCKED',
        'ACTION_APPROVAL_REQUIRED',
        'MCP_TOOL_CALLED',
        'INDEXING_COMPLETED',
        'RUN_REPLAYED',
      ]

      for (const type of eventTypes) {
        es.addEventListener(type, (event) => {
          try {
            const data = JSON.parse(event.data) as PlaygroundEvent
            setEvents((prev) => [data, ...prev].slice(0, 200))
          } catch {
            // ignore parse errors
          }
        })
      }
    }

    connect()

    return () => {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
  }, [apiStatus])

  const clearEvents = useCallback(() => setEvents([]), [])

  return { events, sseStatus, clearEvents }
}

// ── Activity Feed Hook ──────────────────────────────────────────────────

export function useActivityFeed() {
  const [entries, setEntries] = useState<ActivityEntryType[]>([])

  const addEntry = useCallback((entry: Omit<ActivityEntryType, 'id' | 'timestamp'>) => {
    const full: ActivityEntryType = {
      ...entry,
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    }
    setEntries((prev) => [full, ...prev].slice(0, 100))
  }, [])

  const clearEntries = useCallback(() => setEntries([]), [])

  return { entries, addEntry, clearEntries }
}

// ── Tool Execution State ────────────────────────────────────────────────

export interface ToolExecutionState {
  resolveContext: ResolveContextResult | null
  checkAction: CheckActionResult | null
  proposeNode: ProposeNodeResult | null
  subgraph: SubgraphResult | null
  pipelineRun: PipelineRunDetail | null
  replayResult: unknown | null
}

/** Return type of useToolExecution — panels should use this for their props. */
export type ToolExec = ReturnType<typeof useToolExecution>

export function useToolExecution() {
  const { status: apiStatus, client } = useApi()
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [results, setResults] = useState<ToolExecutionState>({
    resolveContext: null,
    checkAction: null,
    proposeNode: null,
    subgraph: null,
    pipelineRun: null,
    replayResult: null,
  })

  const setResult = useCallback(
    <K extends keyof ToolExecutionState>(key: K, value: ToolExecutionState[K]) => {
      setResults((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const _clearError = useCallback((key: string) => {
    setErrors((prev) => ({ ...prev, [key]: null }))
  }, [])

  return { results, setResult, loading, setLoading, errors, setErrors, client, apiStatus }
}

// ── MCP Session & Tools ─────────────────────────────────────────────────

export function useMcpSession() {
  const { status: apiStatus, client } = useApi()
  const [session, setSession] = useState<McpSessionInfo | null>(null)
  const [tools, setTools] = useState<McpToolInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (apiStatus !== 'ready' || client === null) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [sessionData, toolsData] = await Promise.allSettled([
          client.playgroundSession(),
          client.playgroundTools(),
        ])
        if (!cancelled) {
          if (sessionData.status === 'fulfilled') setSession(sessionData.value)
          if (toolsData.status === 'fulfilled') setTools(toolsData.value)
        }
      } catch {
        // fallback defaults
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [apiStatus, client])

  return { session, tools, loading }
}
