'use client'

import * as React from 'react'
import {
  Boxes,
  ChevronRight,
  CircleAlert,
  CircleStop,
  GitBranch,
  GitCompare,
  History,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { useApi } from '@/components/dashboard/api-provider'
import {
  ContextQueryPanel,
  type ContextQuerySubmission,
} from '@/components/dashboard/context-query-panel'
import { ContextPackageSummary } from '@/components/dashboard/context-package-summary'
import { RuleExplanationPanel } from '@/components/dashboard/rule-explanation-panel'
import {
  StageDurationHeatmap,
  type BenchmarkStageRow,
} from '@/components/dashboard/stage-duration-heatmap'
import { useApiData } from '@/hooks/use-api-data'
import { cn } from '@/lib/utils'
import type {
  ContextPackage,
  PipelineCandidate,
  PipelineRunRecord,
  PipelineTraceEntry,
} from '@/lib/api/types'

/** Stagger per stage (ms) — the whole 10-stage trace replays in ~3s. */
const STAGE_STEP_MS = 300

export default function PipelinePage() {
  const { client, bootstrap, status } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null

  const nodes = useApiData(
    async (api) => (workspaceId === null ? [] : api.knowledgeNodes(workspaceId)),
    [workspaceId],
  )
  const runs = useApiData(
    async (api) => (workspaceId === null ? [] : api.pipelineRuns(workspaceId, 8)),
    [workspaceId],
  )

  const [result, setResult] = React.useState<ContextPackage | null>(null)
  const [running, setRunning] = React.useState(false)
  const [runError, setRunError] = React.useState<string | null>(null)
  const [benchmarkRows, setBenchmarkRows] = React.useState<BenchmarkStageRow[]>([])
  const [benchmarkProgress, setBenchmarkProgress] = React.useState<number | null>(null)
  const cancelRef = React.useRef(false)

  const nodeList = React.useMemo(() => nodes.data ?? [], [nodes.data])

  const runPipeline = React.useCallback(
    async (submission: ContextQuerySubmission) => {
      if (client === null || workspaceId === null) return
      setRunning(true)
      setRunError(null)
      cancelRef.current = false
      try {
        if (submission.benchmark) {
          // Benchmark mode: resolve every node sequentially, collecting the
          // per-stage timings each run already returns.
          const rows: BenchmarkStageRow[] = []
          const total = submission.nodes.length
          for (let index = 0; index < total; index += 1) {
            if (cancelRef.current) break
            const node = submission.nodes[index]
            if (node === undefined) break
            setBenchmarkProgress(index + 1)
            const pkg = await client.resolveContext(workspaceId, {
              entryNodeId: node.id,
              maxDepth: submission.maxDepth,
              strategy: submission.strategy,
              tokenBudget: submission.tokenBudget,
              maxCandidates: submission.maxCandidates,
              mode: 'DEBUG',
            })
            rows.push({
              entryNodeId: node.id,
              entryTitle: node.title,
              stageDurations: pkg.summary.metrics.stageDurationsMs,
              totalMs: pkg.summary.metrics.totalDurationMs,
            })
          }
          setBenchmarkRows(rows)
          if (rows.length > 0) setResult(null)
        } else {
          const pkg = await client.resolveContext(workspaceId, {
            entryNodeId: submission.entryNodeId,
            maxDepth: submission.maxDepth,
            strategy: submission.strategy,
            tokenBudget: submission.tokenBudget,
            maxCandidates: submission.maxCandidates,
            // DEBUG returns the per-stage results + full per-node rule traces.
            mode: 'DEBUG',
          })
          setResult(pkg)
          setBenchmarkRows([])
        }
      } catch (error) {
        if (cancelRef.current) {
          setRunError('Benchmark canceled')
        } else {
          setRunError(error instanceof Error ? error.message : 'Pipeline execution failed')
          setResult(null)
        }
      } finally {
        setRunning(false)
        setBenchmarkProgress(null)
      }
    },
    [client, workspaceId],
  )

  const titleById = React.useMemo(
    () => new Map(nodeList.map((node) => [node.id, node.title])),
    [nodeList],
  )

  const replayRun = React.useCallback(
    async (requestId: string) => {
      if (client === null) return
      setRunning(true)
      setRunError(null)
      try {
        setResult(await client.replayPipelineRun(requestId))
        runs.reload()
      } catch (error) {
        setRunError(error instanceof Error ? error.message : 'Replay failed')
      } finally {
        setRunning(false)
      }
    },
    [client, runs],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description="Watch the context pipeline execute stage by stage — authorization, graph traversal, rules, ranking and budgeting — with the node counts flowing through."
      >
        <Badge variant="outline" className="gap-1.5">
          <GitBranch className="size-3" />
          Live trace · DEBUG mode
        </Badge>
      </PageHeader>

      {status === 'error' && (
        <Card>
          <CardContent className="text-destructive flex items-center gap-2 py-4 text-sm">
            <CircleAlert className="size-4" />
            API unavailable — the pipeline needs the NestJS backend.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ContextQueryPanel
            nodes={nodeList}
            loading={nodes.loading}
            running={running}
            disabled={workspaceId === null || status === 'error'}
            error={runError}
            submitLabel="Run pipeline"
            emptyHint={
              status === 'ready'
                ? 'No nodes are visible in this workspace for your authorization scope. Switch the demo user in the top bar (e.g. to Dr. Amelia Chen) to run the pipeline.'
                : undefined
            }
            benchmarkLabel="Benchmark all nodes"
            onResolve={(submission) => void runPipeline(submission)}
          />
          {running && benchmarkProgress !== null && (
            <div className="border-border bg-card space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <LoaderCircle className="animate-spin" />
                  Benchmarking…
                </span>
                <button
                  type="button"
                  onClick={() => {
                    cancelRef.current = true
                  }}
                  className="text-muted-foreground hover:text-destructive flex items-center gap-1 text-[11px]"
                >
                  <CircleStop className="size-3.5" />
                  Stop
                </button>
              </div>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{
                    width: `${((benchmarkProgress ?? 0) / Math.max(nodeList.length, 1)) * 100}%`,
                  }}
                />
              </div>
              <p className="text-muted-foreground text-[10px]">
                {benchmarkProgress ?? 0} / {nodeList.length} nodes resolved
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <RunHistory runs={runs.data ?? []} loading={runs.loading} onReplay={replayRun} />

          {benchmarkRows.length > 0 && <StageDurationHeatmap rows={benchmarkRows} />}

          {result === null && benchmarkRows.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={GitBranch}
                  title="Run the pipeline"
                  description="Pick an entry node and run — every stage lights up in execution order, the funnel counts flow between them, and the ranked package lands below."
                />
              </CardContent>
            </Card>
          ) : null}

          {result !== null ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Execution trace</CardTitle>
                  <CardDescription>
                    The 10 stages in deterministic order; each card&apos;s bar and count show the
                    nodes flowing into the next stage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ContextPackageSummary result={result} />
                  <TracePlayer trace={result.summary.trace} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ranked package</CardTitle>
                  <CardDescription>
                    Rule-passing candidates, ranked deterministically and fitted into the budget.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RankedList result={result} />
                  <RuleExplanationPanel
                    nodes={[
                      ...result.candidates.map((candidate) => ({
                        id: candidate.candidateId,
                        title: candidate.title,
                        included: true,
                      })),
                      ...result.exclusions.map((exclusion) => ({
                        id: exclusion.nodeId,
                        title: titleById.get(exclusion.nodeId) ?? exclusion.nodeId,
                        included: false,
                        excludedByBudget: exclusion.excludedByBudget,
                      })),
                    ]}
                    explanations={result.exclusions.map((exclusion) => ({
                      nodeId: exclusion.nodeId,
                      included: false,
                      finalReasonCode: exclusion.finalReasonCode,
                      failingRuleId: exclusion.failingRuleId,
                      ruleResults: exclusion.ruleResults ?? [],
                    }))}
                    titleById={titleById}
                  />
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Past executions from the immutable pipeline-run event store. Expanding a row
 *  fetches the full record by requestId to inspect its persisted trace and
 *  package; Replay re-executes the run deterministically. Compare mode lets you
 *  pick two runs of the same entry node and diff them side by side. */
function RunHistory({
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

/** Side-by-side diff of two historical runs of the same entry node: funnel
 *  counts, candidate sets (kept / added / removed), and per-stage durations. */
function RunDiffCard({
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
          {runStamp(left)} vs {runStamp(right)} — same entry node, side by side.
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
                <th className="py-1 text-right font-medium">Run 1</th>
                <th className="py-1 text-right font-medium">Run 2</th>
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

function DiffCandidateCell({ candidate }: { candidate: PipelineCandidate | undefined }) {
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

/** Inspects one immutable run: metadata, the persisted trace + package (completed
 *  runs) or the failing stage + sanitized error (failed runs). */
function RunDetail({ run }: { run: PipelineRunRecord }) {
  const packageView = runRecordToPackage(run)
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-3">
        <MetadataItem label="Entry node" value={run.entryNodeId} mono />
        <MetadataItem label="Strategy" value={run.strategy} mono />
        <MetadataItem label="Depth" value={String(run.maxDepth)} mono />
        <MetadataItem label="Token budget" value={String(run.tokenBudget)} mono />
        <MetadataItem label="Max candidates" value={String(run.maxCandidates)} mono />
        <MetadataItem label="Tokens used" value={String(run.tokensUsed)} mono />
        <MetadataItem label="Evaluated at" value={new Date(run.evaluatedAt).toLocaleString()} />
        <MetadataItem label="Version" value={run.version} mono />
        <MetadataItem label="Request id" value={run.requestId} mono />
      </dl>

      {run.status === 'failed' || packageView === null ? (
        <>
          <div className="border-destructive/30 bg-destructive/5 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs">
            <CircleAlert className="text-destructive mt-0.5 size-3.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">
                Run failed at stage{' '}
                <span className="font-mono">{run.failedStageId ?? 'unknown'}</span>
              </p>
              <p className="text-muted-foreground font-mono">
                {run.error?.code ?? 'ERR_PIPELINE'}: {run.error?.message ?? 'No error recorded'}
              </p>
              <p className="text-muted-foreground">
                Failed runs never persist a partial package — nothing was published. Stages after
                the failure were never executed.
              </p>
            </div>
          </div>
          <TracePlayer
            trace={run.trace}
            failedStageId={run.failedStageId}
            failedError={run.error}
          />
        </>
      ) : (
        <>
          <ContextPackageSummary result={packageView} />
          <TracePlayer trace={packageView.summary.trace} />
          <RankedList result={packageView} />
          <RuleExplanationPanel
            nodes={[
              ...packageView.candidates.map((candidate) => ({
                id: candidate.candidateId,
                title: candidate.title,
                included: true,
              })),
              ...packageView.exclusions.map((exclusion) => ({
                id: exclusion.nodeId,
                title: exclusion.nodeId,
                included: false,
                excludedByBudget: exclusion.excludedByBudget,
              })),
            ]}
            explanations={packageView.exclusions.map((exclusion) => ({
              nodeId: exclusion.nodeId,
              included: false,
              finalReasonCode: exclusion.finalReasonCode,
              failingRuleId: exclusion.failingRuleId,
              ruleResults: exclusion.ruleResults ?? [],
            }))}
          />
        </>
      )}
    </div>
  )
}

function MetadataItem({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-[10px] tracking-wide uppercase">{label}</dt>
      <dd className={cn('truncate font-medium', mono && 'font-mono text-[11px]')} title={value}>
        {value}
      </dd>
    </div>
  )
}

/** Rebuilds the package view model of a completed run from its immutable record
 *  (the persisted payloads are exact JSON round-trips of the live shapes). */
function runRecordToPackage(run: PipelineRunRecord): ContextPackage | null {
  if (
    run.status !== 'completed' ||
    run.metrics === null ||
    run.candidates === null ||
    run.exclusions === null
  ) {
    return null
  }
  const { metrics } = run
  return {
    packageId: run.packageId ?? '',
    requestId: run.requestId,
    version: run.version,
    mode: run.mode,
    workspaceId: run.workspaceId,
    entryNodeId: run.entryNodeId,
    strategy: run.strategy === 'weighted' ? 'weighted' : 'bfs',
    evaluatedAt: run.evaluatedAt,
    generatedAt: run.createdAt,
    tokenBudget: run.tokenBudget,
    tokensUsed: run.tokensUsed,
    truncated: metrics.excludedByBudget > 0 || metrics.excludedByRank > 0,
    candidates: run.candidates,
    exclusions: run.exclusions,
    summary: {
      requestId: run.requestId,
      packageId: run.packageId ?? '',
      version: run.version,
      mode: run.mode,
      evaluatedAt: run.evaluatedAt,
      funnel: {
        reachable: metrics.reachableNodes,
        authorized: metrics.authorizedNodes,
        ruleCandidates: metrics.ruleCandidates,
        included: metrics.includedCandidates,
      },
      metrics,
      trace: run.trace,
    },
  }
}

/** The animated 10-stage timeline: stages rise in sequence, counts pop,
 *  funnel bars grow, and packets flow down the rail into the next stage.
 *  When inspecting a failed run, pass `failedStageId` (and the sanitized
 *  `failedError`) so the failing stage is highlighted and its error shown. */
function TracePlayer({
  trace,
  failedStageId = null,
  failedError = null,
}: {
  trace: readonly PipelineTraceEntry[]
  failedStageId?: string | null
  failedError?: { code: string; message: string } | null
}) {
  const [replayTick, setReplayTick] = React.useState(0)
  const [paused, setPaused] = React.useState(false)

  const maxCount = Math.max(...trace.map((step) => step.outputCount ?? 0), 1)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 font-mono">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            live
          </Badge>
          <span className="text-muted-foreground text-xs">
            {trace.length} stages · ~{(trace.length * STAGE_STEP_MS) / 1000}s
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? 'Resume trace' : 'Pause trace'}
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReplayTick((value) => value + 1)}
            aria-label="Replay trace"
          >
            <RotateCcw className="size-3.5" />
            Replay
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'border-border bg-muted/30 rounded-lg border p-4',
          paused && 'cg-pipeline-paused',
        )}
      >
        <div key={replayTick}>
          {trace.map((step, index) => {
            const delay = index * STAGE_STEP_MS
            const pct = Math.max(4, ((step.outputCount ?? 0) / maxCount) * 100)
            const completed = step.status === 'completed'
            const failed = step.stageId === failedStageId
            return (
              <div key={step.stageId} className="relative flex gap-3 pb-5 last:pb-0">
                {/* Rail: dot + downward connector with a flowing packet. */}
                <div className="flex w-4 shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      'cg-pipeline-stage ring-background mt-1.5 size-2.5 shrink-0 rounded-full ring-2',
                      completed ? 'bg-emerald-500' : 'bg-rose-500',
                      failed && 'animate-pulse',
                    )}
                    style={{ animationDelay: `${delay}ms` }}
                  />
                  {index < trace.length - 1 && (
                    <span className="bg-border relative my-1 w-px flex-1 overflow-visible">
                      <span
                        className="cg-pipeline-flow bg-primary absolute top-0 -left-[2px] size-1.5 rounded-full shadow-[0_0_6px_rgba(var(--cg-glow),0.8)]"
                        style={{ animationDelay: `${delay + 120}ms` }}
                      />
                    </span>
                  )}
                </div>

                {/* Stage card: name + duration, funnel bar + count. */}
                <div
                  className={cn(
                    'cg-pipeline-stage border-border bg-card min-w-0 flex-1 rounded-lg border px-3 py-2.5',
                    !completed && 'border-rose-500/40',
                    failed && 'border-rose-500/60 ring-2 ring-rose-500/15',
                  )}
                  style={{ animationDelay: `${delay}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{step.stageName}</span>
                    {failed && (
                      <Badge
                        variant="destructive"
                        className="shrink-0 gap-1 px-1.5 py-0 text-[9px] font-semibold"
                      >
                        <CircleAlert className="size-2.5" />
                        failed
                      </Badge>
                    )}
                    <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[10px]">
                      {step.durationMs.toFixed(1)} ms
                    </span>
                  </div>
                  {failed && failedError !== null && (
                    <p className="text-destructive mt-1.5 truncate font-mono text-[10px]">
                      {failedError.code}: {failedError.message}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="bg-muted h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
                      <div
                        className={cn(
                          'cg-pipeline-bar h-full rounded-full',
                          completed ? 'bg-primary/70' : 'bg-rose-500/70',
                        )}
                        style={{ width: `${pct}%`, animationDelay: `${delay + 120}ms` }}
                      />
                    </div>
                    <span
                      className="cg-pipeline-count min-w-7 text-right font-mono text-sm font-bold tabular-nums"
                      style={{ animationDelay: `${delay + 140}ms` }}
                    >
                      {failed ? (
                        <CircleAlert className="size-3.5 text-rose-500" />
                      ) : (
                        (step.outputCount ?? '–')
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-muted-foreground mt-3 text-[10px]">
          Bar width is proportional to the count (funnel shape); the packet marks the hand-off to
          the next stage. Reduced-motion users see the full trace statically.
        </p>
      </div>
    </div>
  )
}

function RankedList({ result }: { result: ContextPackage }) {
  if (result.candidates.length === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title="No candidates survived"
        description="Every reachable node was removed by the rule pipeline, or the ranking/budget cut all of them. Check the explanations below."
      />
    )
  }
  return (
    <div className="space-y-2">
      {result.candidates.map((candidate) => (
        <div key={candidate.candidateId} className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded font-mono text-[9px] font-bold',
              candidate.rank === 1
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-muted text-muted-foreground',
            )}
          >
            #{candidate.rank}
          </span>
          <span className="text-muted-foreground font-mono text-[10px]">
            {candidate.score.toFixed(1)}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'gap-1 px-1.5 py-0 text-[9px] font-semibold',
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
            <Sparkles className="size-2.5" />
            {candidate.compressionHint}
          </Badge>
          <span className="min-w-0 truncate text-sm">{candidate.title}</span>
          <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[10px]">
            ~{candidate.tokens} tokens
          </span>
        </div>
      ))}
    </div>
  )
}
