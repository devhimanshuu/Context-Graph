'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Key, Building2, Shield, Bot, Zap } from 'lucide-react'

interface McpConnectionPanelProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  principalName: string
  principalRole: string
  organizationName: string
  organizationId: string
  workspaceId: string
  sseStatus: string
}

const STATUS_CONFIG = {
  connected: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Wifi, label: 'Connected' },
  connecting: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Wifi, label: 'Connecting' },
  disconnected: { color: 'text-red-600', bg: 'bg-red-50', icon: WifiOff, label: 'Disconnected' },
  error: { color: 'text-red-600', bg: 'bg-red-50', icon: WifiOff, label: 'Error' },
} as const

const CAPABILITY_LABELS: Record<string, string> = {
  'context.resolve': 'Context Resolve',
  'graph.read': 'Graph Read',
  'pipeline.read': 'Pipeline Read',
  'pipeline.replay': 'Pipeline Replay',
  'knowledge.write': 'Knowledge Write',
}

export function McpConnectionPanel({
  status,
  principalName,
  principalRole,
  organizationName,
  organizationId,
  workspaceId,
  sseStatus,
}: McpConnectionPanelProps) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  const capabilities = ['context.resolve', 'graph.read', 'pipeline.read', 'pipeline.replay']

  return (
    <Card className="border-muted-foreground/20">
      <CardContent className="flex items-center gap-6 py-3">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className={`${cfg.bg} flex h-8 w-8 items-center justify-center rounded-lg`}>
            <Icon className={`h-4 w-4 ${cfg.color}`} />
          </div>
          <div>
            <div className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</div>
            <div className="text-muted-foreground text-[10px]">MCP Server</div>
          </div>
        </div>

        <div className="bg-border h-8 w-px" />

        {/* Principal */}
        <div className="flex items-center gap-2">
          <Bot className="text-muted-foreground h-4 w-4" />
          <div>
            <div className="text-xs font-medium">{principalName}</div>
            <div className="text-muted-foreground text-[10px]">{principalRole}</div>
          </div>
        </div>

        <div className="bg-border h-8 w-px" />

        {/* Organization */}
        <div className="flex items-center gap-2">
          <Building2 className="text-muted-foreground h-4 w-4" />
          <div>
            <div className="text-xs font-medium">{organizationName}</div>
            <div className="text-muted-foreground font-mono text-[10px]">
              {organizationId.slice(0, 8)}…
            </div>
          </div>
        </div>

        <div className="bg-border h-8 w-px" />

        {/* Workspace */}
        <div className="flex items-center gap-2">
          <Key className="text-muted-foreground h-4 w-4" />
          <div>
            <div className="text-xs font-medium">Workspace</div>
            <div className="text-muted-foreground font-mono text-[10px]">
              {workspaceId.slice(0, 8)}…
            </div>
          </div>
        </div>

        <div className="bg-border h-8 w-px" />

        {/* Capabilities */}
        <div className="flex items-center gap-1.5">
          <Shield className="text-muted-foreground h-3.5 w-3.5" />
          <div className="flex flex-wrap gap-1">
            {capabilities.map((cap) => (
              <Badge key={cap} variant="secondary" className="px-1.5 py-0 font-mono text-[10px]">
                {CAPABILITY_LABELS[cap] ?? cap}
              </Badge>
            ))}
          </div>
        </div>

        <div className="bg-border h-8 w-px" />

        {/* SSE Status */}
        <div className="flex items-center gap-1.5">
          <Zap className="text-muted-foreground h-3.5 w-3.5" />
          <Badge
            variant={sseStatus === 'connected' ? 'default' : 'secondary'}
            className="text-[10px]"
          >
            SSE {sseStatus}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
