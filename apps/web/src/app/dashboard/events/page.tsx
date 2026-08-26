'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity,
  RefreshCw,
  Radio,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
} from 'lucide-react'

interface EventEnvelope {
  eventId: string
  eventType: string
  eventVersion: number
  organizationId: string
  aggregateType: string
  aggregateId: string
  actorId: string | null
  source: string
  correlationId: string | null
  timestamp: string
  payload: Record<string, unknown>
  classification: string
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  NODE_PUBLISHED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  NODE_PROPOSED: 'bg-blue-100 text-blue-700 border-blue-200',
  NODE_APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  NODE_REJECTED: 'bg-red-100 text-red-700 border-red-200',
  PIPELINE_COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PIPELINE_FAILED: 'bg-red-100 text-red-700 border-red-200',
  ACTION_CHECKED: 'bg-blue-100 text-blue-700 border-blue-200',
  ACTION_BLOCKED: 'bg-red-100 text-red-700 border-red-200',
  MCP_TOOL_CALLED: 'bg-violet-100 text-violet-700 border-violet-200',
  INDEXING_STARTED: 'bg-amber-100 text-amber-700 border-amber-200',
  INDEXING_COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const SOURCE_COLORS: Record<string, string> = {
  REST: 'bg-blue-50 text-blue-600',
  MCP: 'bg-violet-50 text-violet-600',
  SYSTEM: 'bg-gray-50 text-gray-600',
  WORKER: 'bg-amber-50 text-amber-600',
  AGENT: 'bg-emerald-50 text-emerald-600',
  ADMIN: 'bg-red-50 text-red-600',
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventEnvelope[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [liveEvents, setLiveEvents] = useState<
    Array<{ eventId: string; eventType: string; timestamp: string }>
  >([])
  const eventSourceRef = useRef<EventSource | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('eventType', filterType)
      params.set('limit', '50')

      const res = await fetch(`/api/v1/events?${params.toString()}`)
      const data = await res.json()
      setEvents(Array.isArray(data) ? data : [])
    } catch {
      // Silently handle
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  // SSE connection for live updates
  useEffect(() => {
    const eventSource = new EventSource('/api/v1/events/stream')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => setConnected(true)
    eventSource.onerror = () => setConnected(false)

    eventSource.addEventListener('NODE_PUBLISHED', (event) => {
      try {
        const data = JSON.parse(event.data)
        setLiveEvents((prev) => [
          { eventId: data.eventId, eventType: data.eventType, timestamp: data.timestamp },
          ...prev.slice(0, 19),
        ])
        // Refetch events to show the new one
        void fetchEvents()
      } catch {
        // Parse error
      }
    })

    eventSource.addEventListener('PIPELINE_COMPLETED', (event) => {
      try {
        const data = JSON.parse(event.data)
        setLiveEvents((prev) => [
          { eventId: data.eventId, eventType: data.eventType, timestamp: data.timestamp },
          ...prev.slice(0, 19),
        ])
      } catch {
        // Parse error
      }
    })

    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [fetchEvents])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Event Stream</h1>
          <p className="text-muted-foreground mt-1">
            Real-time ContextGraph events — reliable delivery via transactional outbox
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <Wifi className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-emerald-600">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600">Disconnected</span>
              </>
            )}
          </div>
          <Button variant="outline" onClick={() => void fetchEvents()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Live Events Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Live Event Feed
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Real-time events delivered via SSE — {connected ? 'streaming' : 'disconnected'}
          </p>
        </CardHeader>
        <CardContent>
          {liveEvents.length === 0 ? (
            <div className="text-muted-foreground flex h-16 items-center justify-center text-sm">
              {connected
                ? 'Waiting for events...'
                : 'SSE connection unavailable — events will appear on refresh'}
            </div>
          ) : (
            <div className="space-y-1">
              {liveEvents.map((event) => (
                <div
                  key={event.eventId}
                  className="bg-muted/30 flex items-center gap-2 rounded border px-3 py-1.5 text-xs"
                >
                  <Zap className="h-3 w-3 text-amber-500" />
                  <Badge variant="outline" className={EVENT_TYPE_COLORS[event.eventType] ?? ''}>
                    {event.eventType}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Event History
            </CardTitle>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium">Filter:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-background rounded-md border px-2 py-1 text-xs"
              >
                <option value="">All events</option>
                <option value="NODE_PUBLISHED">Node Published</option>
                <option value="NODE_PROPOSED">Node Proposed</option>
                <option value="PIPELINE_COMPLETED">Pipeline Completed</option>
                <option value="ACTION_CHECKED">Action Checked</option>
                <option value="MCP_TOOL_CALLED">MCP Tool Called</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center">
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center">
              No events found
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.eventId}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {event.eventType.includes('FAILED') || event.eventType.includes('BLOCKED') ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : event.eventType.includes('COMPLETED') ||
                      event.eventType.includes('PUBLISHED') ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : event.eventType.includes('STARTED') ||
                      event.eventType.includes('PROPOSED') ? (
                      <Clock className="h-4 w-4 text-blue-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={EVENT_TYPE_COLORS[event.eventType] ?? ''}
                        >
                          {event.eventType}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          v{event.eventVersion}
                        </Badge>
                        <Badge variant="outline" className={SOURCE_COLORS[event.source] ?? ''}>
                          {event.source}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        {event.aggregateType} · {event.aggregateId.slice(0, 8)}… ·{' '}
                        {new Date(event.timestamp).toLocaleString()}
                        {event.correlationId && (
                          <span> · correlation: {event.correlationId.slice(0, 8)}…</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-muted-foreground text-xs">{event.classification}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
