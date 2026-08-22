'use client'

import * as React from 'react'
import { CircleAlert, CircleStop, GitBranch, LoaderCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { useApi } from '@/components/dashboard/api-provider'
import {
  ContextQueryPanel,
  type ContextQuerySubmission,
} from '@/components/dashboard/context-query-panel'
import { ContextPackageSummary } from '@/components/dashboard/context-package-summary'
import { RuleExplanationPanel } from '@/components/dashboard/rule-explanation-panel'
import { TracePlayer, RankedList } from '@/components/dashboard/pipeline-run-detail'
import {
  StageDurationHeatmap,
  type BenchmarkStageRow,
} from '@/components/dashboard/stage-duration-heatmap'
import { RunHistory } from './pipeline-components'
import { useKnowledgeNodes, usePipelineRuns } from '@/hooks/use-api-query'

import type { ContextPackage } from '@/lib/api/types'

export default function PipelinePage() {
  const { client, bootstrap, status } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null

  const nodes = useKnowledgeNodes(workspaceId)
  const runs = usePipelineRuns(workspaceId, 8)

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
        void runs.refetch()
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
            loading={nodes.isPending}
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
          <RunHistory runs={runs.data ?? []} loading={runs.isPending} onReplay={replayRun} />

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
