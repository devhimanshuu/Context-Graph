'use client'

import * as React from 'react'
import {
  Boxes,
  CircleAlert,
  CircleStop,
  GitBranch,
  History,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
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
import type { ContextPackage, PipelineTraceEntry } from '@/lib/api/types'

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

/** Past executions from the immutable pipeline-run event store, with replay. */
function RunHistory({
  runs,
  loading,
  onReplay,
}: {
  runs: readonly {
    requestId: string
    status: string
    mode: string
    createdAt: string
    tokensUsed: number
  }[]
  loading: boolean
  onReplay: (requestId: string) => Promise<void>
}) {
  const [replayingId, setReplayingId] = React.useState<string | null>(null)
  if (loading) return <Skeleton className="h-24 w-full" />
  if (runs.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="text-muted-foreground size-4" />
          Run history
        </CardTitle>
        <CardDescription>Immutable executions — replay any run deterministically.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {runs.map((run) => (
          <div
            key={run.requestId}
            className="hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
          >
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
            <span className="text-muted-foreground ml-auto shrink-0 text-[10px]">
              {new Date(run.createdAt).toLocaleString()}
            </span>
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
        ))}
      </CardContent>
    </Card>
  )
}

/** The animated 10-stage timeline: stages rise in sequence, counts pop,
 *  funnel bars grow, and packets flow down the rail into the next stage. */
function TracePlayer({ trace }: { trace: readonly PipelineTraceEntry[] }) {
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
            return (
              <div key={step.stageId} className="relative flex gap-3 pb-5 last:pb-0">
                {/* Rail: dot + downward connector with a flowing packet. */}
                <div className="flex w-4 shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      'cg-pipeline-stage ring-background mt-1.5 size-2.5 shrink-0 rounded-full ring-2',
                      completed ? 'bg-emerald-500' : 'bg-rose-500',
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
                  )}
                  style={{ animationDelay: `${delay}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{step.stageName}</span>
                    <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[10px]">
                      {step.durationMs.toFixed(1)} ms
                    </span>
                  </div>
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
                      {step.outputCount ?? '–'}
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
