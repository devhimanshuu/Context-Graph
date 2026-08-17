'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Boxes,
  CircleCheck,
  Circle,
  Gauge,
  ScrollText,
  ShieldCheck,
  Timer,
  Waypoints,
} from 'lucide-react'
import { EmptyState } from '@/components/dashboard/empty-state'
import { HealthStatusCard } from '@/components/dashboard/health-status-card'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { useApiQuery } from '@/hooks/use-api-query'
import { APP } from '@/constants'
import { pipelineRunDetail } from '@/constants/routes'
import type { PipelineRunRecord } from '@/lib/api/types'

const ROADMAP = [
  { label: 'Project foundation & architecture', done: true },
  { label: 'Database layer & domain model (schema, migrations, seed)', done: true },
  { label: 'Application layer — contracts, DI, pipeline blueprint', done: true },
  { label: 'Graph engine — BFS traversal, validation, reachability (NestJS)', done: true },
  { label: 'Authorization engine — RBAC, policies, compiled contexts (NestJS)', done: true },
  { label: 'Rule engine — deterministic filtering, explainability, metrics (NestJS)', done: true },
  { label: 'Context pipeline & candidate builder (NestJS)', done: true },
  { label: 'Versioned REST API layer (/api/v1)', done: true },
  { label: 'AI integrations & analytics', done: false },
] as const

/** Loads the counts that power the overview stat cards in parallel. */
interface PipelineStats {
  resolutions: number
  avgDurationMs: number
  avgCandidates: number
  ruleRejectionRate: number
}

/** Aggregates the persisted run history into real platform metrics (no fabricated trends). */
function summarizeRuns(runs: readonly PipelineRunRecord[]): PipelineStats {
  const completed = runs.filter((run) => run.status === 'completed' && run.metrics !== null)
  if (completed.length === 0) {
    return { resolutions: runs.length, avgDurationMs: 0, avgCandidates: 0, ruleRejectionRate: 0 }
  }
  const totalDuration = completed.reduce((sum, run) => sum + (run.metrics?.totalDurationMs ?? 0), 0)
  const totalCandidates = completed.reduce(
    (sum, run) => sum + (run.metrics?.includedCandidates ?? 0),
    0,
  )
  const totalReachable = completed.reduce((sum, run) => sum + (run.metrics?.reachableNodes ?? 0), 0)
  const totalSurvivors = completed.reduce((sum, run) => sum + (run.metrics?.ruleCandidates ?? 0), 0)
  return {
    resolutions: completed.length,
    avgDurationMs: totalDuration / completed.length,
    avgCandidates: totalCandidates / completed.length,
    ruleRejectionRate: totalReachable > 0 ? 1 - totalSurvivors / totalReachable : 0,
  }
}

function useOverviewStats() {
  const { bootstrap } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null
  const nodes = useApiQuery<number>(['overview-node-count', workspaceId ?? 'none'], async (api) =>
    workspaceId === null ? 0 : (await api.knowledgeNodes(workspaceId)).length,
  )
  const edges = useApiQuery<number>(['overview-edge-count', workspaceId ?? 'none'], async (api) =>
    workspaceId === null ? 0 : (await api.graphEdges(workspaceId)).length,
  )
  const rules = useApiQuery<number>(['overview-rule-count', workspaceId ?? 'none'], async (api) =>
    workspaceId === null ? 0 : (await api.workspaceRules(workspaceId)).length,
  )
  const runs = useApiQuery<PipelineRunRecord[]>(
    ['overview-pipeline-runs', workspaceId ?? 'none'],
    async (api) => (workspaceId === null ? [] : api.pipelineRuns(workspaceId, 50)),
  )
  return { nodes, edges, rules, runs }
}

function MetricValue({ value, suffix }: { value: number | null | undefined; suffix?: string }) {
  if (value === null || value === undefined) return <Skeleton className="h-8 w-12" />
  return (
    <span className="text-2xl font-semibold tracking-tight">
      {Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
      {suffix !== undefined && (
        <span className="text-muted-foreground text-sm font-normal"> {suffix}</span>
      )}
    </span>
  )
}

export default function OverviewPage() {
  const { context, selectedUser } = useApi()
  const { nodes, edges, rules, runs } = useOverviewStats()
  const stats = React.useMemo(() => summarizeRuns(runs.data ?? []), [runs.data])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={`Welcome to ${APP.name} — your enterprise context intelligence workspace.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Knowledge nodes
            </CardTitle>
            <Waypoints className="text-muted-foreground size-4 shrink-0" />
          </CardHeader>
          <CardContent className="space-y-1">
            <MetricValue value={nodes.data} />
            <p className="text-muted-foreground text-xs">In the demo workspace</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">Edges</CardTitle>
            <Boxes className="text-muted-foreground size-4 shrink-0" />
          </CardHeader>
          <CardContent className="space-y-1">
            <MetricValue value={edges.data} />
            <p className="text-muted-foreground text-xs">Typed relationships</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Active rules
            </CardTitle>
            <ScrollText className="text-muted-foreground size-4 shrink-0" />
          </CardHeader>
          <CardContent className="space-y-1">
            <MetricValue value={rules.data} />
            <p className="text-muted-foreground text-xs">Stored context rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">My access</CardTitle>
            <ShieldCheck className="text-muted-foreground size-4 shrink-0" />
          </CardHeader>
          <CardContent className="space-y-1">
            {context === null ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">
                  {context.permissionLevel}
                </span>
                <Badge variant="outline" className="text-[10px] font-normal">
                  {context.complianceClearance}
                </Badge>
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              {selectedUser !== null
                ? `As ${selectedUser.name} (${selectedUser.role})`
                : 'Compiled from the authorization engine'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Context resolutions
            </CardTitle>
            <Gauge className="text-muted-foreground size-4 shrink-0" />
          </CardHeader>
          <CardContent className="space-y-1">
            <MetricValue value={runs.isPending ? null : stats.resolutions} />
            <p className="text-muted-foreground text-xs">
              {stats.resolutions === 0
                ? 'Run the pipeline to record the first one'
                : 'Completed pipeline executions'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Avg pipeline duration
            </CardTitle>
            <Timer className="text-muted-foreground size-4 shrink-0" />
          </CardHeader>
          <CardContent className="space-y-1">
            <MetricValue value={runs.isPending ? null : stats.avgDurationMs} suffix="ms" />
            <p className="text-muted-foreground text-xs">Across persisted runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Avg candidates
            </CardTitle>
            <Boxes className="text-muted-foreground size-4 shrink-0" />
          </CardHeader>
          <CardContent className="space-y-1">
            <MetricValue value={runs.isPending ? null : stats.avgCandidates} />
            <p className="text-muted-foreground text-xs">Included per context package</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Rule rejection
            </CardTitle>
            <Gauge className="text-muted-foreground size-4 shrink-0" />
          </CardHeader>
          <CardContent className="space-y-1">
            <MetricValue value={runs.isPending ? null : stats.ruleRejectionRate * 100} suffix="%" />
            <p className="text-muted-foreground text-xs">Of reachable nodes removed by rules</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Getting started</CardTitle>
            <CardDescription>Platform delivery roadmap</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {ROADMAP.map((item) => {
                const DoneIcon = item.done ? CircleCheck : Circle
                return (
                  <li key={item.label} className="flex items-center gap-3 text-sm">
                    <DoneIcon
                      className={
                        item.done
                          ? 'size-4 shrink-0 text-emerald-500'
                          : 'text-muted-foreground/60 size-4 shrink-0'
                      }
                    />
                    <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                      {item.label}
                    </span>
                    {item.done && (
                      <span className="ml-auto rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        Complete
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <HealthStatusCard />
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {runs.isPending ? (
                <Skeleton className="h-40 w-full" />
              ) : (runs.data ?? []).length === 0 ? (
                <EmptyState
                  icon={Waypoints}
                  title="Nothing yet"
                  description="Graph traversals, rule evaluations and context assemblies will appear here once you run the pipeline."
                />
              ) : (
                <ul className="space-y-2">
                  {(runs.data ?? []).slice(0, 5).map((run) => (
                    <li key={run.requestId}>
                      <Link
                        href={pipelineRunDetail(run.requestId)}
                        className="hover:bg-muted/60 flex items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors"
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
                        <span className="text-muted-foreground truncate">
                          {new Date(run.createdAt).toLocaleString()}
                        </span>
                        <span className="ml-auto shrink-0 font-mono text-[10px]">
                          {run.metrics?.includedCandidates ?? '—'} cands
                        </span>
                        <ArrowUpRight className="text-muted-foreground/60 size-3.5 shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
