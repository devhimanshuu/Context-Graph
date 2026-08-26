'use client'

import type { ActivityEntry } from '@/hooks/use-playground'
import { Search, ShieldAlert, FileText, Zap } from 'lucide-react'

const TYPE_ICON: Record<string, React.ElementType> = {
  tool_call: Search,
  action_check: ShieldAlert,
  proposal: FileText,
  event: Zap,
}

const TYPE_COLOR: Record<string, string> = {
  tool_call: 'bg-emerald-500',
  action_check: 'bg-amber-500',
  proposal: 'bg-blue-500',
  event: 'bg-violet-500',
}

interface ExecutionTimelineProps {
  entries: ActivityEntry[]
}

export function ExecutionTimeline({ entries }: ExecutionTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
        Timeline will show tool execution flow
      </div>
    )
  }

  const maxDuration = Math.max(...entries.map((e) => e.durationMs ?? 0), 1)

  return (
    <div className="space-y-0.5">
      {entries.slice(0, 20).map((entry, i) => {
        const Icon = TYPE_ICON[entry.type] ?? Zap
        const dotColor = TYPE_COLOR[entry.type] ?? 'bg-muted-foreground'
        const pct = Math.max(((entry.durationMs ?? 0) / maxDuration) * 100, 5)

        return (
          <div key={entry.id} className="flex items-center gap-2 text-[11px]">
            {/* Timeline dot + line */}
            <div className="flex w-4 flex-col items-center">
              <div className={`h-2 w-2 rounded-full ${dotColor}`} />
              {i < entries.length - 1 && <div className="bg-border w-px" style={{ height: 16 }} />}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Icon className="text-muted-foreground h-3 w-3" />
                <span className="font-medium">{entry.toolName}</span>
                <span className="text-muted-foreground text-[9px]">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {/* Duration bar */}
              <div className="bg-muted mt-0.5 h-1.5 w-full overflow-hidden rounded-full">
                <div className={`h-full rounded-full ${dotColor}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-muted-foreground mt-0.5 text-[9px]">
                {entry.durationMs !== null && entry.durationMs !== undefined
                  ? `${entry.durationMs}ms`
                  : '—'}
                <span className="mx-1">·</span>
                <span
                  className={
                    entry.status === 'success' ||
                    entry.status === 'allow' ||
                    entry.status === 'published'
                      ? 'text-emerald-600'
                      : entry.status === 'error' ||
                          entry.status === 'deny' ||
                          entry.status === 'rejected'
                        ? 'text-red-600'
                        : 'text-amber-600'
                  }
                >
                  {entry.status}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
