'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Play, Bot, Loader2, Clock, Zap, Shield, CheckCircle2, Radio } from 'lucide-react'

interface ExecutionResult {
  executionId: string
  status: string
  finalResponse: string | null
  iterations: number
  toolCalls: number
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  durationMs: number
  error: string | null
}

interface StreamEvent {
  type: string
  executionId: string
  timestamp: string
  [key: string]: unknown
}

const EVENT_ICONS: Record<string, string> = {
  EXECUTION_STARTED: '🚀',
  PLAN_CREATED: '📋',
  STEP_STARTED: '📌',
  TOOL_STARTED: '🔧',
  TOOL_COMPLETED: '✅',
  OBSERVATION: '👁️',
  STATE_TRANSITION: '🔄',
  VERIFICATION: '🔍',
  GENERATING_RESPONSE: '💬',
  EXECUTION_COMPLETE: '🏁',
  EXECUTION_FAILED: '❌',
  INJECTION_DETECTED: '🛡️',
  LIMIT_REACHED: '⚠️',
  STATUS_UPDATE: '📊',
}

const EVENT_COLORS: Record<string, string> = {
  EXECUTION_STARTED: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  PLAN_CREATED: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  STEP_STARTED: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  TOOL_STARTED: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  TOOL_COMPLETED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  OBSERVATION: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  VERIFICATION: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
  EXECUTION_COMPLETE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  EXECUTION_FAILED: 'bg-red-500/10 text-red-700 dark:text-red-400',
  INJECTION_DETECTED: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
}

export default function AgentRunPage() {
  const [request, setRequest] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const addStreamEvent = useCallback((event: StreamEvent) => {
    setStreamEvents((prev) => [...prev, event])
  }, [])

  const handleRun = async () => {
    if (!request.trim() || isRunning) return

    setIsRunning(true)
    setError(null)
    setResult(null)
    setStreamEvents([])

    try {
      // First, start the agent execution
      const res = await fetch('/api/v1/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRequest: request.trim(),
          workspaceId: '00000000-0000-0000-0000-000000000000',
        }),
      })

      if (!res.ok) {
        const errBody = await res.json()
        throw new Error(errBody.message ?? 'Agent execution failed')
      }

      const data: ExecutionResult = await res.json()
      setResult(data)

      // Connect to SSE stream for the execution
      connectToStream(data.executionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsRunning(false)
    }
  }

  const connectToStream = (executionId: string) => {
    if (eventSourceRef.current !== null) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(`/api/v1/agents/executions/${executionId}/stream`)
    eventSourceRef.current = eventSource
    setIsStreaming(true)

    // Listen for all event types
    const eventTypes = [
      'EXECUTION_STARTED',
      'PLAN_CREATED',
      'STEP_STARTED',
      'TOOL_STARTED',
      'TOOL_COMPLETED',
      'OBSERVATION',
      'STATE_TRANSITION',
      'VERIFICATION',
      'GENERATING_RESPONSE',
      'EXECUTION_COMPLETE',
      'EXECUTION_FAILED',
      'INJECTION_DETECTED',
      'LIMIT_REACHED',
      'STATUS_UPDATE',
    ]

    for (const eventType of eventTypes) {
      eventSource.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as StreamEvent
          addStreamEvent(data)
        } catch {
          // Skip malformed events
        }
      })
    }

    // Also listen for generic messages
    eventSource.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as StreamEvent
        addStreamEvent(data)
      } catch {
        // Skip
      }
    }

    eventSource.onerror = () => {
      setIsStreaming(false)
      eventSource.close()
      eventSourceRef.current = null
    }
  }

  const handleCancel = () => {
    if (eventSourceRef.current !== null) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsStreaming(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Run Agent</h1>
        <p className="text-muted-foreground">
          Send a request to the ContextGraph agent. Watch the execution unfold in real-time via SSE
          streaming.
        </p>
      </div>

      {/* Request Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent Request
          </CardTitle>
          <CardDescription>
            Enter your question or task. The agent will plan, retrieve authorized context, and
            produce a grounded response.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., What are the key compliance requirements for our healthcare workspace?"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              Events stream in real-time via Server-Sent Events (SSE).
            </p>
            <div className="flex gap-2">
              {isStreaming && (
                <Button variant="outline" onClick={handleCancel}>
                  Disconnect
                </Button>
              )}
              <Button onClick={handleRun} disabled={!request.trim() || isRunning}>
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Agent
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error !== null && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results + Streaming */}
      {(result !== null || streamEvents.length > 0) && (
        <div className="space-y-4">
          {/* Summary Stats */}
          {result !== null && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Status
                  </div>
                  <p className="mt-1 text-2xl font-bold">{result.status}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    Duration
                  </div>
                  <p className="mt-1 text-2xl font-bold">
                    {(result.durationMs / 1000).toFixed(1)}s
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4" />
                    Tool Calls
                  </div>
                  <p className="mt-1 text-2xl font-bold">{result.toolCalls}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4" />
                    Cost
                  </div>
                  <p className="mt-1 text-2xl font-bold">${result.estimatedCost.toFixed(4)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Live Event Stream */}
          {streamEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-green-500" />
                  Live Execution Events
                  {isStreaming && (
                    <Badge
                      variant="secondary"
                      className="bg-green-500/10 text-green-700 dark:text-green-400"
                    >
                      Streaming
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Real-time events via SSE — {streamEvents.length} events received
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {streamEvents.map((event, idx) => (
                    <div
                      key={idx}
                      className="hover:bg-muted/30 flex items-start gap-3 rounded-lg border p-3 transition-colors"
                    >
                      <span className="text-lg">{EVENT_ICONS[event.type] ?? '📌'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={EVENT_COLORS[event.type] ?? ''}>
                            {event.type}
                          </Badge>
                          {typeof event.toolName === 'string' && (
                            <span className="text-muted-foreground text-xs">{event.toolName}</span>
                          )}
                          {typeof event.summary === 'string' && (
                            <span className="text-muted-foreground truncate text-xs">
                              {event.summary}
                            </span>
                          )}
                        </div>
                        {typeof event.success === 'boolean' && (
                          <p className="mt-1 text-xs">
                            {event.success ? '✅ Success' : '❌ Failed'}
                            {typeof event.durationMs === 'number' && (
                              <span className="text-muted-foreground ml-2">
                                ({(event.durationMs / 1000).toFixed(2)}s)
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Final Response */}
          {result?.finalResponse !== null && result?.finalResponse !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle>Agent Response</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{result.finalResponse}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
