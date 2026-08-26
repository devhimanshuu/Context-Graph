'use client'

import { useState } from 'react'
import { useApi } from '@/components/dashboard/api-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePlaygroundEvents, useActivityFeed, useToolExecution } from '@/hooks/use-playground'
import { McpConnectionPanel } from './mcp-connection-panel'
import { ToolTabs } from './tool-tabs'
import { ActivityFeed } from './activity-feed'
import { EventConsole } from './event-console'
import { ExecutionTimeline } from './execution-timeline'
import { Terminal, Trash2, Expand, Minimize2 } from 'lucide-react'

export default function AgentPlaygroundPage() {
  const { bootstrap, selectedUser } = useApi()
  const { events, sseStatus, clearEvents } = usePlaygroundEvents()
  const { entries, addEntry, clearEntries } = useActivityFeed()
  const toolExec = useToolExecution()
  const [bottomExpanded, setBottomExpanded] = useState(false)
  const [rightExpanded, setRightExpanded] = useState(false)

  const orgName = bootstrap?.organizationName ?? 'Unknown Org'
  const workspaceId = bootstrap?.workspaceId ?? ''

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <Terminal className="text-primary h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Playground</h1>
            <p className="text-muted-foreground text-sm">
              MCP developer console — interact with ContextGraph as an AI agent
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={sseStatus === 'connected' ? 'default' : 'secondary'} className="gap-1">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                sseStatus === 'connected' ? 'bg-emerald-500' : 'bg-muted-foreground'
              }`}
            />
            SSE {sseStatus}
          </Badge>
        </div>
      </div>

      {/* ── MCP Connection Panel ───────────────────────────────────────── */}
      <McpConnectionPanel
        status="connected"
        principalName={selectedUser?.name ?? 'Demo User'}
        principalRole={selectedUser?.role ?? 'VIEWER'}
        organizationName={orgName}
        organizationId={bootstrap?.organizationId ?? ''}
        workspaceId={workspaceId}
        sseStatus={sseStatus}
      />

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left: Tool Tabs */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <ToolTabs workspaceId={workspaceId} toolExec={toolExec} addEntry={addEntry} />
        </div>

        {/* Right: Activity Feed + Execution Timeline */}
        <div
          className={`flex flex-col gap-4 transition-all ${
            rightExpanded ? 'w-[420px]' : 'w-[320px]'
          } shrink-0`}
        >
          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <span className="bg-primary/10 text-primary inline-flex h-5 w-5 items-center justify-center rounded text-xs font-bold">
                  {entries.length}
                </span>
                Activity Feed
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setRightExpanded((v) => !v)}
                >
                  {rightExpanded ? (
                    <Minimize2 className="h-3 w-3" />
                  ) : (
                    <Expand className="h-3 w-3" />
                  )}
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={clearEntries}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <ActivityFeed entries={entries} />
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Execution Timeline</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <ExecutionTimeline entries={entries} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Bottom: Events Console ─────────────────────────────────────── */}
      <Card
        className={`shrink-0 transition-all ${
          bottomExpanded ? 'h-[400px]' : 'h-[180px]'
        } flex flex-col`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                sseStatus === 'connected' ? 'bg-emerald-500' : 'bg-muted-foreground'
              }`}
            />
            Live Event Stream
            <Badge variant="outline" className="font-mono text-xs">
              {events.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setBottomExpanded((v) => !v)}
            >
              {bottomExpanded ? <Minimize2 className="h-3 w-3" /> : <Expand className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={clearEvents}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto">
          <EventConsole events={events} />
        </CardContent>
      </Card>
    </div>
  )
}
