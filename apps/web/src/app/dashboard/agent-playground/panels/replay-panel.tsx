'use client'

import { useCallback, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RotateCcw, ArrowRight } from 'lucide-react'
import type { ToolExec, ActivityEntry } from '@/hooks/use-playground'

interface Props {
  toolExec: ToolExec
  addEntry: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
}

export function ReplayPanel({ toolExec, addEntry }: Props) {
  const { client, loading, setLoading, errors, setErrors, results, setResult } = toolExec
  const [runId, setRunId] = useState('')

  const isLoading = loading.replayResult ?? false
  const result = results.replayResult as {
    originalRunId?: string
    replayRunId?: string
    status?: string
    metrics?: { originalDurationMs: number; replayDurationMs: number; candidateDelta: number }
  } | null

  const handleReplay = useCallback(async () => {
    if (client === null || !runId.trim()) return
    setLoading((prev) => ({ ...prev, replayResult: true }))
    setErrors((prev) => ({ ...prev, replayResult: null }))

    const start = performance.now()
    try {
      const res = await client.playgroundReplayRun(runId.trim())
      const durationMs = Math.round(performance.now() - start)
      setResult('replayResult', res)
      addEntry({
        type: 'tool_call',
        toolName: 'replay_run',
        status: 'success',
        detail: `Replayed ${runId.trim().slice(0, 8)}… → ${res.replayRunId?.slice(0, 8) ?? '—'}…`,
        durationMs,
        runId: res.replayRunId,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setErrors((prev) => ({ ...prev, replayResult: msg }))
      addEntry({
        type: 'tool_call',
        toolName: 'replay_run',
        status: 'error',
        detail: msg,
        durationMs: Math.round(performance.now() - start),
      })
    } finally {
      setLoading((prev) => ({ ...prev, replayResult: false }))
    }
  }, [client, runId, setLoading, setErrors, setResult, addEntry])

  return (
    <div className="space-y-4">
      {/* Tool Header */}
      <div className="flex items-center gap-2">
        <RotateCcw className="text-primary h-4 w-4" />
        <h3 className="text-sm font-semibold">replay_run</h3>
        <Badge variant="outline" className="text-[10px]">
          pipeline.replay
        </Badge>
      </div>
      <p className="text-muted-foreground text-xs">
        Replay an existing pipeline execution using the current authorization state. The replay
        produces a new run with current policies — it does not reproduce historical authorization.
      </p>

      {/* Input */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium">Run ID to Replay *</label>
          <input
            type="text"
            value={runId}
            onChange={(e) => setRunId(e.target.value)}
            placeholder="UUID of the pipeline run"
            className="bg-background w-full rounded-md border px-3 py-2 font-mono text-sm"
          />
        </div>
        <Button
          onClick={() => void handleReplay()}
          disabled={!runId.trim() || client === null || isLoading}
          className="gap-2"
          size="sm"
        >
          {isLoading ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          {isLoading ? 'Replaying...' : 'Replay Run'}
        </Button>
      </div>

      {/* Error */}
      {errors.replayResult && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {errors.replayResult}
        </div>
      )}

      {/* Result */}
      {result !== null && (
        <div className="space-y-3">
          <div className="bg-muted/30 rounded-lg border p-3">
            <div className="mb-2 text-xs font-medium">Replay Result</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded border p-2">
                <div className="text-muted-foreground text-[10px]">Original</div>
                <div className="font-mono text-xs">
                  {result.originalRunId?.slice(0, 12) ?? '—'}…
                </div>
              </div>
              <ArrowRight className="text-muted-foreground h-4 w-4" />
              <div className="flex-1 rounded border border-emerald-200 bg-emerald-50 p-2">
                <div className="text-[10px] font-medium text-emerald-700">Replay</div>
                <div className="font-mono text-xs text-emerald-600">
                  {result.replayRunId?.slice(0, 12) ?? '—'}…
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <Badge variant="outline">{result.status ?? 'completed'}</Badge>
              {result.metrics && (
                <>
                  <span className="text-muted-foreground">
                    Original: {result.metrics.originalDurationMs}ms
                  </span>
                  <span className="text-muted-foreground">
                    Replay: {result.metrics.replayDurationMs}ms
                  </span>
                  <span className="text-muted-foreground">
                    Candidate Δ: {result.metrics.candidateDelta > 0 ? '+' : ''}
                    {result.metrics.candidateDelta}
                  </span>
                </>
              )}
            </div>
            <p className="text-muted-foreground mt-2 text-[10px]">
              ⚠️ This replay uses <strong>current</strong> authorization policies, not the
              historical ones from the original run.
            </p>
          </div>
        </div>
      )}

      {/* Information */}
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
        <p className="text-xs text-blue-700">
          <strong>Historical vs Current:</strong> Replay re-evaluates the pipeline with current
          organization policies, permissions, and graph state. The original run&apos;s authorization
          decisions may differ from the replay&apos;s.
        </p>
      </div>
    </div>
  )
}
