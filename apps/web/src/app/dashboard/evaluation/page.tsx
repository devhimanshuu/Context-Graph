'use client'

import * as React from 'react'
import {
  FlaskConical,
  Play,
  Square,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Cpu,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import type {
  EvaluationExperiment,
  EvaluationDataset,
  EvaluationRun,
  EvaluationMetrics,
} from '@/lib/api/types'

// ---------------------------------------------------------------------------
// Polling interval for active runs (ms)
// ---------------------------------------------------------------------------
const POLL_INTERVAL_MS = 3_000

// ---------------------------------------------------------------------------
// Metric bar — small horizontal bar for a single metric value.
// ---------------------------------------------------------------------------
function MetricBar({
  label,
  value,
  max = 1,
  format = 'percent',
}: {
  label: string
  value: number
  max?: number
  format?: 'percent' | 'ms' | 'count' | 'currency'
}) {
  const pct = Math.min(100, (value / max) * 100)
  const display =
    format === 'percent'
      ? `${(value * 100).toFixed(1)}%`
      : format === 'ms'
        ? `${Math.round(value)}ms`
        : format === 'currency'
          ? `$${value.toFixed(4)}`
          : String(Math.round(value))

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-mono">{label}</span>
        <span className="font-mono font-medium">{display}</span>
      </div>
      <div className="bg-muted h-1.5 rounded-full">
        <div
          className="bg-primary h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metrics card — renders a section of evaluation metrics.
// ---------------------------------------------------------------------------
function MetricsCard({
  title,
  icon: Icon,
  metrics,
}: {
  title: string
  icon: React.ElementType
  metrics: {
    label: string
    value: number
    max?: number
    format?: 'percent' | 'ms' | 'count' | 'currency'
  }[]
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Icon className="text-muted-foreground size-4" />
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map((m) => (
          <MetricBar key={m.label} label={m.label} value={m.value} max={m.max} format={m.format} />
        ))}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
    running: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
    pending: 'border-muted text-muted-foreground',
    failed: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
    cancelled: 'border-muted text-muted-foreground',
  }
  return (
    <Badge variant="outline" className={`text-[10px] font-medium ${styles[status] ?? ''}`}>
      {status}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Start Run card — select experiment & dataset, trigger evaluation, poll status
// ---------------------------------------------------------------------------
function StartRunCard({
  experiments,
  datasets,
  onStart,
  onCancel,
  activeRun,
  loading,
}: {
  experiments: EvaluationExperiment[]
  datasets: EvaluationDataset[]
  onStart: (experimentId: string, datasetId: string) => void
  onCancel: (runId: string) => void
  activeRun: EvaluationRun | null
  loading: boolean
}) {
  const [selectedExperiment, setSelectedExperiment] = React.useState('')
  const [selectedDataset, setSelectedDataset] = React.useState('')

  const canStart =
    selectedExperiment !== '' && selectedDataset !== '' && activeRun === null && !loading

  const experiment = experiments.find((e) => e.experimentId === selectedExperiment)
  const dataset = datasets.find((d) => d.datasetId === selectedDataset)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Play className="text-muted-foreground size-4" />
          Start Evaluation Run
        </CardTitle>
        <CardDescription>
          Select an experiment and dataset, then run the evaluation pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active run progress */}
        {activeRun !== null && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LoaderCircle className="size-4 animate-spin text-amber-500" />
                <span className="text-sm font-medium">
                  {activeRun.status === 'running' ? 'Running evaluation…' : 'Starting evaluation…'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(activeRun.runId)}
                className="text-destructive hover:text-destructive"
              >
                <Square className="size-3.5" />
                Cancel
              </Button>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{
                    width:
                      activeRun.totalCases > 0
                        ? `${((activeRun.passedCases + activeRun.failedCases) / activeRun.totalCases) * 100}%`
                        : '0%',
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Run {activeRun.runId.slice(0, 8)}…</span>
                <span className="text-muted-foreground">
                  {activeRun.passedCases + activeRun.failedCases} / {activeRun.totalCases} cases
                  {activeRun.passedCases > 0 && (
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                      (
                      {((activeRun.passedCases / Math.max(activeRun.totalCases, 1)) * 100).toFixed(
                        0,
                      )}
                      % pass)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Selection form */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Experiment</label>
            <select
              value={selectedExperiment}
              onChange={(e) => setSelectedExperiment(e.target.value)}
              disabled={activeRun !== null}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full items-center rounded-lg border px-2.5 text-sm outline-none disabled:opacity-50"
            >
              <option value="">Select an experiment…</option>
              {experiments.map((exp) => (
                <option key={exp.experimentId} value={exp.experimentId}>
                  {exp.name} ({exp.model})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Dataset</label>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              disabled={activeRun !== null}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full items-center rounded-lg border px-2.5 text-sm outline-none disabled:opacity-50"
            >
              <option value="">Select a dataset…</option>
              {datasets.map((ds) => (
                <option key={ds.datasetId} value={ds.datasetId}>
                  {ds.name} v{ds.version} ({ds.metadata.totalCases} cases)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected config preview */}
        {(experiment !== undefined || dataset !== undefined) && (
          <div className="flex flex-wrap gap-2">
            {experiment !== undefined && (
              <Badge variant="outline" className="text-[10px]">
                {experiment.model} · {experiment.provider}
              </Badge>
            )}
            {dataset !== undefined && (
              <Badge variant="outline" className="text-[10px]">
                {dataset.metadata.totalCases} cases · {dataset.metadata.category}
              </Badge>
            )}
          </div>
        )}

        {/* Start button */}
        <Button onClick={() => onStart(selectedExperiment, selectedDataset)} disabled={!canStart}>
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
          {activeRun !== null ? 'Run in progress…' : 'Start evaluation'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function EvaluationPage() {
  const { client } = useApi()

  const [experiments, setExperiments] = React.useState<EvaluationExperiment[]>([])
  const [datasets, setDatasets] = React.useState<EvaluationDataset[]>([])
  const [runs, setRuns] = React.useState<EvaluationRun[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Active run state
  const [activeRun, setActiveRun] = React.useState<EvaluationRun | null>(null)
  const [starting, setStarting] = React.useState(false)
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollRef.current !== null) clearInterval(pollRef.current)
    }
  }, [])

  // Load data
  React.useEffect(() => {
    if (client === null) return
    setLoading(true)
    Promise.all([
      client.evaluationExperiments().catch(() => []),
      client.evaluationDatasets().catch(() => []),
      client.evaluationRuns().catch(() => []),
    ])
      .then(([exp, ds, r]) => {
        setExperiments(exp)
        setDatasets(ds)
        setRuns(r)

        // Check if there's already an active run
        const active = r.find((run) => run.status === 'running' || run.status === 'pending')
        if (active !== undefined) {
          setActiveRun(active)
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [client])

  // Poll for active run status
  const startPolling = React.useCallback(
    (runId: string) => {
      if (pollRef.current !== null) clearInterval(pollRef.current)

      pollRef.current = setInterval(async () => {
        if (client === null) return
        try {
          const updated = await client.evaluationRun(runId)
          setActiveRun(updated)

          // Stop polling when run is terminal
          if (
            updated.status === 'completed' ||
            updated.status === 'failed' ||
            updated.status === 'cancelled'
          ) {
            if (pollRef.current !== null) clearInterval(pollRef.current)
            pollRef.current = null
            setActiveRun(null)

            // Refresh the runs list
            const refreshed = await client.evaluationRuns().catch(() => [])
            setRuns(refreshed)
          }
        } catch {
          // If the run fetch fails, stop polling
          if (pollRef.current !== null) clearInterval(pollRef.current)
          pollRef.current = null
          setActiveRun(null)
        }
      }, POLL_INTERVAL_MS)
    },
    [client],
  )

  // Start a new evaluation run
  const startRun = React.useCallback(
    async (experimentId: string, datasetId: string) => {
      if (client === null) return
      setStarting(true)
      setError(null)
      try {
        const run = await client.startEvaluationRun(experimentId, datasetId)
        setActiveRun(run)
        setRuns((prev) => [run, ...prev])
        startPolling(run.runId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start evaluation run')
      } finally {
        setStarting(false)
      }
    },
    [client, startPolling],
  )

  // Cancel the active run
  const cancelRun = React.useCallback(
    async (runId: string) => {
      if (client === null) return
      try {
        await client.cancelEvaluationRun(runId)
        // Update the run in the list
        setRuns((prev) =>
          prev.map((r) => (r.runId === runId ? { ...r, status: 'cancelled' as const } : r)),
        )
        setActiveRun(null)
        if (pollRef.current !== null) clearInterval(pollRef.current)
        pollRef.current = null
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to cancel run')
      }
    },
    [client],
  )

  // Aggregate metrics from completed runs
  const aggregateMetrics = React.useMemo(() => {
    const completed = runs.filter((r) => r.status === 'completed' && r.metrics !== null)
    if (completed.length === 0) return null
    const avg = (selector: (m: EvaluationMetrics) => number) =>
      completed.reduce((sum, r) => sum + selector(r.metrics!), 0) / completed.length
    return {
      precisionAt5: avg((m) => m.retrieval.precisionAt5),
      recallAt5: avg((m) => m.retrieval.recallAt5),
      mrr: avg((m) => m.retrieval.mrr),
      citationPrecision: avg((m) => m.citation.citationPrecision),
      citationRecall: avg((m) => m.citation.citationRecall),
      groundedness: avg((m) => m.answer.groundednessScore),
      hallucinationRate: avg((m) => m.answer.hallucinationRate),
      avgLatencyMs: avg((m) => m.latency.averageTotalLatencyMs),
      totalCostUsd: completed.reduce((sum, r) => sum + r.metrics!.cost.totalCostUsd, 0),
      securityViolations: completed.reduce(
        (sum, r) =>
          sum +
          r.metrics!.security.authorizationViolations +
          r.metrics!.security.tenantIsolationViolations,
        0,
      ),
    }
  }, [runs])

  // Status counts
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const run of runs) {
      counts[run.status] = (counts[run.status] ?? 0) + 1
    }
    return counts
  }, [runs])

  const totalCases = React.useMemo(() => runs.reduce((sum, r) => sum + r.totalCases, 0), [runs])

  const totalPassed = React.useMemo(() => runs.reduce((sum, r) => sum + r.passedCases, 0), [runs])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluation"
        description="Experiments, datasets, and quality gates — evaluation pipeline for retrieval, citation, answer quality, and security."
      >
        <Badge variant="outline" className="gap-1.5">
          <FlaskConical className="size-3" />
          Phase 14
        </Badge>
      </PageHeader>

      {error !== null && (
        <Card>
          <CardContent className="text-destructive flex items-center gap-2 py-4 text-sm">
            <XCircle className="size-4" />
            {error}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Experiments', value: experiments.length, icon: Cpu },
          { label: 'Datasets', value: datasets.length, icon: Database },
          { label: 'Total Runs', value: runs.length, icon: FlaskConical },
          {
            label: 'Pass Rate',
            value: totalCases > 0 ? `${((totalPassed / totalCases) * 100).toFixed(1)}%` : '—',
            icon: CheckCircle2,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {stat.label}
              </CardTitle>
              <stat.icon className="text-muted-foreground size-4 shrink-0" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-3xl font-semibold tracking-tight">{stat.value}</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Run status breakdown */}
      {!loading && runs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(statusCounts).map(([status, _count]) => (
            <StatusBadge key={status} status={status} />
          ))}
          <Badge variant="outline" className="text-[10px]">
            {totalCases} total cases
          </Badge>
          {activeRun !== null && (
            <Badge variant="outline" className="gap-1.5 border-amber-500/40 text-[10px]">
              <LoaderCircle className="size-3 animate-spin" />
              Run in progress
            </Badge>
          )}
        </div>
      )}

      {/* Start Run */}
      {!loading && experiments.length > 0 && datasets.length > 0 && (
        <StartRunCard
          experiments={experiments}
          datasets={datasets}
          onStart={startRun}
          onCancel={cancelRun}
          activeRun={activeRun}
          loading={starting}
        />
      )}

      {/* Aggregate metrics */}
      {!loading && aggregateMetrics !== null && (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricsCard
            title="Retrieval Quality"
            icon={BarChart3}
            metrics={[
              { label: 'Precision@5', value: aggregateMetrics.precisionAt5 },
              { label: 'Recall@5', value: aggregateMetrics.recallAt5 },
              { label: 'MRR', value: aggregateMetrics.mrr },
            ]}
          />
          <MetricsCard
            title="Citation & Answer"
            icon={FlaskConical}
            metrics={[
              { label: 'Citation Precision', value: aggregateMetrics.citationPrecision },
              { label: 'Citation Recall', value: aggregateMetrics.citationRecall },
              { label: 'Groundedness', value: aggregateMetrics.groundedness },
              { label: 'Hallucination Rate', value: aggregateMetrics.hallucinationRate },
            ]}
          />
          <MetricsCard
            title="Performance"
            icon={Clock}
            metrics={[
              {
                label: 'Avg Latency',
                value: aggregateMetrics.avgLatencyMs,
                format: 'ms',
                max: 10000,
              },
              { label: 'Total Cost', value: aggregateMetrics.totalCostUsd, format: 'currency' },
              {
                label: 'Security Violations',
                value: aggregateMetrics.securityViolations,
                format: 'count',
                max: 1,
              },
            ]}
          />
        </div>
      )}

      {/* Experiments */}
      <Card>
        <CardHeader>
          <CardTitle>Experiments</CardTitle>
          <CardDescription>
            Evaluation experiment configurations — each defines a model, dataset, and pipeline
            version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : experiments.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No experiments"
              description="Create an experiment via the API to start evaluating your pipeline."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="pr-4 pb-2 font-medium">Name</th>
                    <th className="pr-4 pb-2 font-medium">Model</th>
                    <th className="pr-4 pb-2 font-medium">Provider</th>
                    <th className="pr-4 pb-2 font-medium">Dataset Version</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {experiments.map((exp) => (
                    <tr key={exp.experimentId} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium">{exp.name}</p>
                        <p className="text-muted-foreground max-w-xs truncate text-xs">
                          {exp.description}
                        </p>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{exp.model}</td>
                      <td className="py-2.5 pr-4 text-xs">{exp.provider}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{exp.datasetVersion}</td>
                      <td className="py-2.5 text-xs">
                        {new Date(exp.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Datasets */}
      <Card>
        <CardHeader>
          <CardTitle>Datasets</CardTitle>
          <CardDescription>
            Versioned evaluation datasets containing test cases for retrieval, citation, and
            security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : datasets.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No datasets"
              description="Upload an evaluation dataset via the API to begin."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {datasets.map((ds) => (
                <Card key={ds.datasetId}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{ds.name}</p>
                        <p className="text-muted-foreground text-xs">{ds.description}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        v{ds.version}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {ds.metadata.totalCases} cases
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {ds.metadata.category}
                      </Badge>
                      {ds.metadata.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Runs */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Runs</CardTitle>
            <CardDescription>
              Evaluation runs and their outcomes — pass/fail per case, with detailed metrics.
            </CardDescription>
          </div>
          {!loading && runs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (client === null) return
                setLoading(true)
                client
                  .evaluationRuns()
                  .then(setRuns)
                  .catch(() => {})
                  .finally(() => setLoading(false))
              }}
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : runs.length === 0 ? (
            <EmptyState
              icon={Play}
              title="No runs yet"
              description="Start an evaluation run above to measure pipeline quality."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="pr-4 pb-2 font-medium">Run ID</th>
                    <th className="pr-4 pb-2 font-medium">Status</th>
                    <th className="pr-4 pb-2 font-medium">Cases</th>
                    <th className="pr-4 pb-2 font-medium">Passed</th>
                    <th className="pr-4 pb-2 font-medium">Failed</th>
                    <th className="pr-4 pb-2 font-medium">Accuracy</th>
                    <th className="pr-4 pb-2 font-medium">Latency</th>
                    <th className="pr-4 pb-2 font-medium">Started</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.slice(0, 20).map((run) => {
                    const accuracy =
                      run.totalCases > 0
                        ? ((run.passedCases / run.totalCases) * 100).toFixed(1)
                        : '—'
                    const latency = run.metrics?.latency.averageTotalLatencyMs
                    const isActive = run.status === 'running' || run.status === 'pending'
                    return (
                      <tr key={run.runId} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 font-mono text-xs">{run.runId.slice(0, 8)}…</td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-1.5">
                            {isActive && (
                              <LoaderCircle className="size-3 animate-spin text-amber-500" />
                            )}
                            <StatusBadge status={run.status} />
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-xs">{run.totalCases}</td>
                        <td className="py-2.5 pr-4 text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {run.passedCases}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-xs">
                          <span
                            className={
                              run.failedCases > 0 ? 'text-rose-600 dark:text-rose-400' : ''
                            }
                          >
                            {run.failedCases}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs">{accuracy}%</td>
                        <td className="py-2.5 pr-4 font-mono text-xs">
                          {latency !== undefined && latency !== null
                            ? `${Math.round(latency)}ms`
                            : '—'}
                        </td>
                        <td className="py-2.5 text-xs">
                          {new Date(run.startedAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right">
                          {isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void cancelRun(run.runId)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Square className="size-3.5" />
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
