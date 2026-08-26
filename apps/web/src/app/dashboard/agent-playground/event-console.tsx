'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { PlaygroundEvent } from '@/lib/api/playground-types'
import { Zap, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react'

const EVENT_ICONS: Record<string, React.ElementType> = {
  NODE_PUBLISHED: CheckCircle,
  NODE_APPROVED: CheckCircle,
  PIPELINE_COMPLETED: CheckCircle,
  INDEXING_COMPLETED: CheckCircle,
  ACTION_CHECKED: Clock,
  NODE_PROPOSED: Clock,
  NODE_REJECTED: XCircle,
  PIPELINE_FAILED: XCircle,
  ACTION_BLOCKED: XCircle,
  MCP_TOOL_CALLED: Zap,
}

const EVENT_COLORS: Record<string, string> = {
  NODE_PUBLISHED: 'text-emerald-600',
  NODE_APPROVED: 'text-emerald-600',
  PIPELINE_COMPLETED: 'text-emerald-600',
  INDEXING_COMPLETED: 'text-emerald-600',
  NODE_PROPOSED: 'text-blue-600',
  ACTION_CHECKED: 'text-blue-600',
  ACTION_APPROVAL_REQUIRED: 'text-amber-600',
  NODE_REJECTED: 'text-red-600',
  PIPELINE_FAILED: 'text-red-600',
  ACTION_BLOCKED: 'text-red-600',
  MCP_TOOL_CALLED: 'text-violet-600',
}

const EVENT_BADGE: Record<string, string> = {
  NODE_PUBLISHED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  NODE_APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PIPELINE_COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  INDEXING_COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  NODE_PROPOSED: 'bg-blue-100 text-blue-700 border-blue-200',
  ACTION_CHECKED: 'bg-blue-100 text-blue-700 border-blue-200',
  NODE_REJECTED: 'bg-red-100 text-red-700 border-red-200',
  PIPELINE_FAILED: 'bg-red-100 text-red-700 border-red-200',
  ACTION_BLOCKED: 'bg-red-100 text-red-700 border-red-200',
  MCP_TOOL_CALLED: 'bg-violet-100 text-violet-700 border-violet-200',
  ACTION_APPROVAL_REQUIRED: 'bg-amber-100 text-amber-700 border-amber-200',
}

interface EventConsoleProps {
  events: PlaygroundEvent[]
}

export function EventConsole({ events }: EventConsoleProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (events.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
        Waiting for events… SSE will deliver real-time ContextGraph events
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {events.slice(0, 50).map((event) => {
        const Icon = EVENT_ICONS[event.eventType] ?? Zap
        const color = EVENT_COLORS[event.eventType] ?? 'text-muted-foreground'
        const badge = EVENT_BADGE[event.eventType] ?? ''
        const isExpanded = expanded === event.eventId

        return (
          <div key={event.eventId} className="hover:bg-muted/30 rounded border transition-colors">
            <button
              onClick={() => setExpanded(isExpanded ? null : event.eventId)}
              className="flex w-full items-center gap-2 p-1.5 text-left"
            >
              {isExpanded ? (
                <ChevronDown className="text-muted-foreground h-3 w-3 shrink-0" />
              ) : (
                <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0" />
              )}
              <Icon className={`h-3 w-3 shrink-0 ${color}`} />
              <Badge variant="outline" className={`shrink-0 text-[9px] ${badge}`}>
                {event.eventType}
              </Badge>
              <span className="text-muted-foreground min-w-0 truncate font-mono text-[10px]">
                {event.aggregateType}:{event.aggregateId.slice(0, 8)}…
              </span>
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <Badge variant="secondary" className="text-[9px]">
                  {event.source}
                </Badge>
                <span className="text-muted-foreground font-mono text-[9px]">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </button>
            {isExpanded && (
              <div className="border-t px-3 py-2 text-[10px]">
                <div className="grid grid-cols-2 gap-1 font-mono">
                  <div>
                    <span className="text-muted-foreground">eventId: </span>
                    {event.eventId}
                  </div>
                  <div>
                    <span className="text-muted-foreground">version: </span>v{event.eventVersion}
                  </div>
                  <div>
                    <span className="text-muted-foreground">org: </span>
                    {event.organizationId.slice(0, 12)}…
                  </div>
                  <div>
                    <span className="text-muted-foreground">classification: </span>
                    {event.classification}
                  </div>
                  {event.correlationId && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">correlation: </span>
                      {event.correlationId}
                    </div>
                  )}
                  {event.actorId && (
                    <div>
                      <span className="text-muted-foreground">actor: </span>
                      {event.actorId.slice(0, 12)}…
                    </div>
                  )}
                </div>
                {event.payload && Object.keys(event.payload).length > 0 && (
                  <pre className="bg-muted/50 mt-2 overflow-x-auto rounded p-2 text-[9px]">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
