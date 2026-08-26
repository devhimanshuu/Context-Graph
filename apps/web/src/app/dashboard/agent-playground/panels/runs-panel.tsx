'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useApiQuery } from '@/hooks/use-api-query'
import { Play, Clock, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react'
import type { ToolExec, ActivityEntry } from '@/hooks/use-playground'

interface Props {
  toolExec: ToolExec
  addEntry: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
}

export function RunsPanel({ toolExec, addEntry: _addEntry }: Props) {
  const { client: _client } = toolExec
  const [runId, setRunId] = useState('')
  const [expanded, setExpanded] = useState(true)

  const { data: runs, isLoading } = useApiQuery(
    ['pipeline-runs-playground', 'all'],
    async (api) => {
      const allRuns: Array<Record<string, unknown>> = []
      try {
        const bootstrap = await api.bootstrap()
        const runs = await api.pipelineRuns(bootstrap.workspaceId, 20)
        allRuns.push(...runs.map((r) => ({ ...r }) as unknown as Record<string, unknown>))
      } catch {
        // ignore
      }
      return allRuns
    },
  )

  return (
    <div className="space-y-4">
      {/* Tool Header */}
      <div className="flex items-center gap-2">
        <Play className="text-primary h-4 w-4" />
        <h3 className="text-sm font-semibold">get_run / replay_run</h3>
        <Badge variant="outline" className="text-[10px]">
          pipeline.read
        </Badge>
      </div>
      <p className="text-muted-foreground text-xs">
        Inspect previous ContextGraph pipeline executions. Each run is immutable and contains the
        full execution trace, stage metrics, and candidates.
      </p>

      {/* Quick Lookup */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium">Run ID (requestId)</label>
          <input
            type="text"
            value={runId}
            onChange={(e) => setRunId(e.target.value)}
            placeholder="UUID of the pipeline run"
            className="bg-background w-full rounded-md border px-3 py-2 font-mono text-sm"
          />
        </div>
      </div>

      {/* Run List */}
      <div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-xs font-medium"
        >
          {expanded ? (
            <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
          )}
          Recent Runs
          <Badge variant="outline" className="text-[10px]">
            {(runs ?? []).length}
          </Badge>
        </button>
        {expanded && (
          <div className="mt-2 space-y-1.5">
            {isLoading ? (
              <div className="text-muted-foreground flex h-16 items-center justify-center text-xs">
                Loading runs...
              </div>
            ) : (runs ?? []).length === 0 ? (
              <div className="text-muted-foreground flex h-16 items-center justify-center text-xs">
                No pipeline runs found
              </div>
            ) : (
              (runs ?? []).slice(0, 15).map((run) => {
                const id = String(run.id ?? run.requestId ?? '')
                const status = String(run.status ?? 'unknown')
                const mode = String(run.mode ?? 'STANDARD')
                const createdAt = String(run.createdAt ?? '')
                const tokensUsed = Number(run.tokensUsed ?? 0)
                const metrics = run.metrics as Record<string, unknown> | null

                return (
                  <div
                    key={id}
                    className="hover:bg-muted/50 flex items-center gap-2 rounded border p-2 transition-colors"
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px]">
                          {mode}
                        </Badge>
                        <Badge
                          variant={status === 'completed' ? 'default' : 'destructive'}
                          className="text-[9px]"
                        >
                          {status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px]">
                        <span className="font-mono">{id.slice(0, 12)}…</span>
                        {createdAt && (
                          <>
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(createdAt).toLocaleString()}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      {metrics && typeof metrics.totalDurationMs === 'number' && (
                        <span className="font-mono">{metrics.totalDurationMs}ms</span>
                      )}
                      <span className="text-muted-foreground font-mono">{tokensUsed} tok</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => setRunId(id)}
                    >
                      View
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
