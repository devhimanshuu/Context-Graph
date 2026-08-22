'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  CircleAlert,
  ExternalLink,
  GitCompare,
  History,
  LoaderCircle,
  RotateCcw,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { RunDetail, runRecordToPackage } from '@/components/dashboard/pipeline-run-detail'
import { cn } from '@/lib/utils'
import { pipelineRunDetail } from '@/constants/routes'
import type { PipelineCandidate, PipelineRunRecord } from '@/lib/api/types'

export function RunStampLink({ run }: { run: PipelineRunRecord }) {
  return (
    <Link
      href={pipelineRunDetail(run.requestId)}
      className="text-primary hover:text-primary/80 font-medium underline-offset-2 hover:underline"
    >
      {runStamp(run)}
    </Link>
  )
}

export function RunHeaderLink({ run, label }: { run: PipelineRunRecord; label: string }) {
  return (
    <Link
      href={pipelineRunDetail(run.requestId)}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium"
    >
      {label}
      <ExternalLink className="size-3" />
    </Link>
  )
}

export function DiffCandidateCell({ candidate }: { candidate: PipelineCandidate | undefined }) {
  if (candidate === undefined) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <span className="inline-flex items-center justify-end gap-1.5 font-mono text-[10px]">
      <span className="text-muted-foreground">#{candidate.rank}</span>
      <span className="tabular-nums">{candidate.score.toFixed(1)}</span>
      <span
        className={cn(
          'rounded border px-1 py-px text-[8px] font-semibold',
          candidate.compressionHint === 'FULL' &&
            'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          candidate.compressionHint === 'SUMMARY' &&
            'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400',
          candidate.compressionHint === 'COMPRESSED' &&
            'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
          candidate.compressionHint === 'REFERENCE_ONLY' &&
            'border-zinc-500/40 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400',
        )}
      >
        {candidate.compressionHint}
      </span>
    </span>
  )
}

function runStamp(run: PipelineRunRecord): string {
  return `${new Date(run.createdAt).toLocaleString()} · ${run.requestId.slice(0, 8)}`
}

/** Past executions from the immutable pipeline-run event store. */
export function RunHistory({
  runs,
  loading,
  onReplay,
}: {
  runs: readonly PipelineRunRecord[]
  loading: boolean
  onReplay: (requestId: string) => Promise<void>
}) {
  const { client } = useApi()
  const [inspectingId, setInspectingId] = React.useState<string | null>(null)
  const [detail, setDetail] = React.useState<PipelineRunRecord | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [detailError, setDetailError] = React.useState<string | null>(null)
  const [replayingId, setReplayingId] = React.useState<string | null>(null)
  const [diffMode, setDiffMode] = React.useState(false)
  const [diffSelection, setDiffSelection] = React.useState<string[]>([])

  const diffAnchor = React.useMemo(() => {
    if (diffSelection.length === 0) return null
    return runs.find((run) => run.requestId === diffSelection[0])?.entryNodeId ?? null
  }, [runs, diffSelection])

  const diffPair = React.useMemo(() => {
    if (diffSelection.length !== 2) return null
    const left = runs.find((run) => run.requestId === diffSelection[0]) ?? null
    const right = runs.find((run) => run.requestId === diffSelection[1]) ?? null
    return left !== null && right !== null ? { left, right } : null
  }, [runs, diffSelection])

  const inspect = React.useCallback(
    async (requestId: string) => {
      if (client === null) return
      setInspectingId(requestId)
      setDetail(null)
      setDetailError(null)
      setDetailLoading(true)
      try {
        setDetail(await client.pipelineRun(requestId))
      } catch (error) {
        setDetailError(error instanceof Error ? error.message : 'Failed to load run')
      } finally {
        setDetailLoading(false)
      }
    },
    [client],
  )

  const toggleDiffMode = () => {
    setDiffMode((value) => {
      if (value) {
        setDiffSelection([])
      } else {
        setInspectingId(null)
        setDetail(null)
      }
      return !value
    })
  }

  if (loading) return <Skeleton className="h-24 w-full" />
  if (runs.length === 0) return null
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="text-muted-foreground size-4" />
              Run history
            </CardTitle>
            <Button variant={diffMode ? 'default' : 'outline'} size="sm" onClick={toggleDiffMode}>
              <GitCompare className="size-3.5" />
              {diffMode ? 'Comparing…' : 'Compare'}
            </Button>
          </div>
          <CardDescription>
            {diffMode
              ? 'Pick two runs of the same entry node to compare funnel, candidates and stage durations.'
              : 'Immutable executions — expand to inspect the stored trace and package, or replay deterministically.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {runs.map((run) => {
            const expanded = inspectingId === run.requestId
            const selectionIndex = diffSelection.indexOf(run.requestId)
            const blocked = diffMode && diffAnchor !== null && run.entryNodeId !== diffAnchor
            return (
              <div
                key={run.requestId}
                className={cn(
                  'rounded-md transition-colors',
                  expanded || selectionIndex >= 0 ? 'bg-muted/40' : 'hover:bg-muted/40',
                  selectionIndex >= 0 && 'ring-primary/30 ring-1',
                )}
              >
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs">
                  <button
                    type="button"
                    title={blocked ? 'Compare only runs of the same entry node' : undefined}
                    onClick={() => {
                      if (diffMode) {
                        if (blocked) return
                        setDiffSelection((prev) => {
                          const index = prev.indexOf(run.requestId)
                          if (index !== -1) return prev.filter((id) => id !== run.requestId)
                          if (prev.length >= 2) return prev
                          return [...prev, run.requestId]
                        })
                        return
                      }
                      if (expanded) {
                        setInspectingId(null)
                        setDetail(null)
                      } else {
                        void inspect(run.requestId)
                      }
                    }}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2 text-left',
                      blocked && 'opacity-40',
                    )}
                  >
                    {diffMode ? (
                      selectionIndex >= 0 ? (
                        <span
                          className={cn(
                            'bg-primary text-primary-foreground flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                            selectionIndex === 1 && 'bg-amber-500 text-amber-50',
                          )}
                        >
                          {selectionIndex + 1}
                        </span>
                      ) : (
                        <span className="border-border size-4 shrink-0 rounded-full border" />
                      )
                    ) : (
                      <ChevronRight
                        className={cn(
                          'text-muted-foreground size-3.5 shrink-0 transition-transform',
                          expanded && 'rotate-90',
                        )}
                      />
                    )}
                    <Badge
                      variant="outline"
                      className={`shrink-0 font-mono text-[9px] ${
                        run.status === 'completed'
                          ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                          : 'border-rose-500/40 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {run.status}
                    </Badge>
                    <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                      {run.mode} · {run.tokensUsed} tokens
                    </span>
                    <span className="text-muted-foreground ml-auto hidden shrink-0 text-[10px] sm:block">
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    disabled={replayingId === run.requestId}
                    onClick={() => {
                      setReplayingId(run.requestId)
                      void onReplay(run.requestId).finally(() => setReplayingId(null))
                    }}
                  >
                    {replayingId === run.requestId ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <RotateCcw className="size-3.5" />
                    )}
                    Replay
                  </Button>
                  <Button variant="ghost" size="sm" className="shrink-0" asChild>
                    <Link
                      href={pipelineRunDetail(run.requestId)}
                      aria-label={`Open run ${run.requestId.slice(0, 8)}`}
                    >
                      <ExternalLink className="size-3.5" />
                      Open
                    </Link>
                  </Button>
                </div>

                {expanded && !diffMode && (
                  <div className="border-border space-y-3 border-t px-3 py-3">
                    {detailLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : detailError !== null ? (
                      <p className="text-destructive flex items-center gap-1.5 text-xs">
                        <CircleAlert className="size-3.5" />
                        {detailError}
                      </p>
                    ) : detail !== null ? (
                      <RunDetail run={detail} />
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {diffPair !== null && (
        <RunDiffCard
          left={diffPair.left}
          right={diffPair.right}
          onClear={() => setDiffSelection([])}
        />
      )}
    </>
  )
}

/** Side-by-side diff of two historical runs of the same entry node. */
export function RunDiffCard({
  left,
  right,
  onClear,
}: {
  left: PipelineRunRecord
  right: PipelineRunRecord
  onClear: () => void
}) {
  const leftPkg = runRecordToPackage(left)
  const rightPkg = runRecordToPackage(right)

  const funnelKeys = [
    ['reachable', 'Reachable'],
    ['authorized', 'Authorized'],
    ['ruleCandidates', 'After rules'],
    ['included', 'In budget'],
  ] as const

  const leftById = React.useMemo(
    () => new Map((leftPkg?.candidates ?? []).map((c) => [c.candidateId, c])),
    [leftPkg],
  )
  const rightById = React.useMemo(
    () => new Map((rightPkg?.candidates ?? []).map((c) => [c.candidateId, c])),
    [rightPkg],
  )
  const candidateRows = React.useMemo(() => {
    const ids = Array.from(new Set([...leftById.keys(), ...rightById.keys()]))
    return ids
      .map((id) => {
        const a = leftById.get(id)
        const b = rightById.get(id)
        const status: 'kept' | 'added' | 'removed' =
          a !== undefined && b !== undefined ? 'kept' : b !== undefined ? 'added' : 'removed'
        return { id, a, b, status }
      })
      .sort((x, y) => {
        const order = { kept: 0, added: 1, removed: 2 }
        if (order[x.status] !== order[y.status]) return order[x.status] - order[y.status]
        return (x.a?.rank ?? x.b?.rank ?? 0) - (y.a?.rank ?? y.b?.rank ?? 0)
      })
  }, [leftById, rightById])

  const stageIds = React.useMemo(
    () =>
      Array.from(
        new Set([
          ...left.trace.map((step) => step.stageId),
          ...right.trace.map((step) => step.stageId),
        ]),
      ),
    [left.trace, right.trace],
  )
  const stageNameById = React.useMemo(
    () => new Map(left.trace.map((step) => [step.stageId, step.stageName])),
    [left.trace],
  )
  const leftMs = React.useMemo(
    () => new Map(left.trace.map((step) => [step.stageId, step.durationMs])),
    [left.trace],
  )
  const rightMs = React.useMemo(
    () => new Map(right.trace.map((step) => [step.stageId, step.durationMs])),
    [right.trace],
  )
  const totalLeft = left.trace.reduce((sum, step) => sum + step.durationMs, 0)
  const totalRight = right.trace.reduce((sum, step) => sum + step.durationMs, 0)

  const configDiffs = [
    left.strategy !== right.strategy && `strategy ${left.strategy} → ${right.strategy}`,
    left.maxDepth !== right.maxDepth && `depth ${left.maxDepth} → ${right.maxDepth}`,
    left.tokenBudget !== right.tokenBudget && `budget ${left.tokenBudget} → ${right.tokenBudget}`,
    left.maxCandidates !== right.maxCandidates &&
      `max candidates ${left.maxCandidates} → ${right.maxCandidates}`,
  ].filter((entry): entry is string => entry !== false)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <GitCompare className="text-muted-foreground size-4" />
            Run diff
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="size-3.5" />
            Clear
          </Button>
        </div>
        <CardDescription>
          <RunStampLink run={left} /> vs <RunStampLink run={right} /> — same entry node, side by
          side.
          {configDiffs.length > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {' '}
              Config differs: {configDiffs.join(' · ')}.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <h4 className="mb-1.5 text-xs font-semibold">Funnel counts</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground text-[10px] tracking-wide uppercase">
                <th className="py-1 pr-2 text-left font-medium">Stage</th>
                <th className="py-1 text-right font-medium">
                  <RunHeaderLink run={left} label="Run 1" />
                </th>
                <th className="py-1 text-right font-medium">
                  <RunHeaderLink run={right} label="Run 2" />
                </th>
                <th className="py-1 text-right font-medium">Δ</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {funnelKeys.map(([key, label]) => {
                const a = leftPkg?.summary.funnel[key]
                const b = rightPkg?.summary.funnel[key]
                const delta = a !== undefined && b !== undefined ? b - a : null
                return (
                  <tr key={key} className="border-border border-t">
                    <td className="py-1.5 pr-2 font-sans font-medium">{label}</td>
                    <td className="py-1.5 text-right tabular-nums">{a ?? '—'}</td>
                    <td className="py-1.5 text-right tabular-nums">{b ?? '—'}</td>
                    <td
                      className={cn(
                        'py-1.5 text-right tabular-nums',
                        delta !== null && delta !== 0 && 'font-semibold',
                      )}
                    >
                      {delta === null ? '—' : delta > 0 ? `+${delta}` : String(delta)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {leftPkg === null && rightPkg === null && (
            <p className="text-muted-foreground mt-1.5 text-[11px]">
              Both runs failed — no funnel or candidate data was persisted.
            </p>
          )}
        </section>

        {candidateRows.length > 0 && (
          <section>
            <h4 className="mb-1.5 text-xs font-semibold">Candidate set</h4>
            <div className="border-border overflow-hidden rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr className="text-muted-foreground text-[10px] tracking-wide uppercase">
                    <th className="px-3 py-1.5 text-left font-medium">Candidate</th>
                    <th className="px-2 py-1.5 text-right font-medium">Run 1</th>
                    <th className="px-3 py-1.5 text-right font-medium">Run 2</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {candidateRows.map((row) => (
                    <tr key={row.id}>
                      <td className="min-w-0 px-3 py-1.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'shrink-0 px-1.5 py-0 text-[9px] font-semibold',
                              row.status === 'kept' &&
                                'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
                              row.status === 'added' &&
                                'border-sky-500/40 text-sky-600 dark:text-sky-400',
                              row.status === 'removed' &&
                                'border-rose-500/40 text-rose-600 dark:text-rose-400',
                            )}
                          >
                            {row.status}
                          </Badge>
                          <span className="truncate text-[13px]">
                            {row.a?.title ?? row.b?.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <DiffCandidateCell candidate={row.a} />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <DiffCandidateCell candidate={row.b} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <h4 className="mb-1.5 text-xs font-semibold">Per-stage duration</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground text-[10px] tracking-wide uppercase">
                <th className="py-1 pr-2 text-left font-medium">Stage</th>
                <th className="py-1 text-right font-medium">Run 1 ms</th>
                <th className="py-1 text-right font-medium">Run 2 ms</th>
                <th className="py-1 text-right font-medium">Δ</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {stageIds.map((stageId) => {
                const a = leftMs.get(stageId)
                const b = rightMs.get(stageId)
                const delta = a !== undefined && b !== undefined ? b - a : null
                return (
                  <tr key={stageId} className="border-border border-t">
                    <td className="py-1.5 pr-2 font-sans font-medium">
                      {stageNameById.get(stageId) ?? stageId}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{a?.toFixed(1) ?? '—'}</td>
                    <td className="py-1.5 text-right tabular-nums">{b?.toFixed(1) ?? '—'}</td>
                    <td
                      className={cn(
                        'py-1.5 text-right tabular-nums',
                        delta !== null && delta < 0 && 'text-emerald-600 dark:text-emerald-400',
                        delta !== null && delta > 0 && 'text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}
                    </td>
                  </tr>
                )
              })}
              <tr className="border-border border-t font-semibold">
                <td className="py-1.5 pr-2">Total</td>
                <td className="py-1.5 text-right tabular-nums">{totalLeft.toFixed(1)}</td>
                <td className="py-1.5 text-right tabular-nums">{totalRight.toFixed(1)}</td>
                <td
                  className={cn(
                    'py-1.5 text-right tabular-nums',
                    totalRight < totalLeft && 'text-emerald-600 dark:text-emerald-400',
                    totalRight > totalLeft && 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {totalRight > totalLeft
                    ? `+${(totalRight - totalLeft).toFixed(1)}`
                    : (totalRight - totalLeft).toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-muted-foreground mt-1.5 text-[10px]">
            Negative Δ = Run 2 was faster. Failed stages (if any) are included with their recorded
            duration.
          </p>
        </section>
      </CardContent>
    </Card>
  )
}
