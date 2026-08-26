'use client'

import { Badge } from '@/components/ui/badge'
import type { ActivityEntry } from '@/hooks/use-playground'
import { Search, ShieldAlert, FileText, Zap } from 'lucide-react'

const TYPE_ICON: Record<string, React.ElementType> = {
  tool_call: Search,
  action_check: ShieldAlert,
  proposal: FileText,
  event: Zap,
}

const STATUS_COLOR: Record<string, string> = {
  success: 'text-emerald-600',
  allow: 'text-emerald-600',
  published: 'text-emerald-600',
  error: 'text-red-600',
  deny: 'text-red-600',
  rejected: 'text-red-600',
  requires_approval: 'text-amber-600',
  pending_approval: 'text-amber-600',
}

interface ActivityFeedProps {
  entries: ActivityEntry[]
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
        No activity yet — run a tool to see the feed
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const Icon = TYPE_ICON[entry.type] ?? Zap
        const color = STATUS_COLOR[entry.status] ?? 'text-muted-foreground'

        return (
          <div
            key={entry.id}
            className="flex items-start gap-2 rounded border px-2 py-1.5 text-[11px]"
          >
            <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${color}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{entry.toolName}</span>
                <Badge variant="outline" className={`px-1 py-0 text-[9px] ${color}`}>
                  {entry.status}
                </Badge>
              </div>
              <div className="text-muted-foreground mt-0.5 truncate text-[10px]">
                {entry.detail}
              </div>
            </div>
            <div className="shrink-0 text-right">
              {entry.durationMs !== null && entry.durationMs !== undefined && (
                <div className="text-muted-foreground font-mono text-[9px]">
                  {entry.durationMs}ms
                </div>
              )}
              <div className="text-muted-foreground font-mono text-[9px]">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
