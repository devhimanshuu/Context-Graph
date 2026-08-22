'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Boxes,
  BrainCircuit,
  FileUp,
  Gauge,
  GitBranch,
  Library,
  Play,
  Search,
  ShieldCheck,
  Waypoints,
  Bot,
} from 'lucide-react'
import { EmptyState } from '@/components/dashboard/empty-state'
import { HealthStatusCard } from '@/components/dashboard/health-status-card'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MetricCard } from '@/components/dashboard/metric-card'
import { useApi } from '@/components/dashboard/api-provider'
import { useApiQuery } from '@/hooks/use-api-query'
import { ROUTES } from '@/constants'
import { pipelineRunDetail } from '@/constants/routes'
import { formatDateTime, formatDuration } from '@/lib/format'
import type { PipelineRunRecord } from '@/lib/api/types'

// ---------------------------------------------------------------------------
// Feature highlights — the story of what ContextGraph does
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    icon: Library,
    title: 'Knowledge Base',
    description:
      'Author and manage structured knowledge nodes with types, compliance tags, and temporal validity.',
    href: ROUTES.knowledge,
    color: 'text-sky-600 dark:text-sky-400',
  },
  {
    icon: Waypoints,
    title: 'Knowledge Graph',
    description:
      'Visualize typed relationships between knowledge — supports, requires, derives from, supersedes.',
    href: ROUTES.knowledgeGraph,
    color: 'text-violet-600 dark:text-violet-400',
  },
  {
    icon: FileUp,
    title: 'Document Ingestion',
    description:
      'Upload documents, extract content, chunk intelligently, and index into the knowledge graph.',
    href: ROUTES.ingestion,
    color: 'text-amber-600 dark:text-amber-400',
  },
  {
    icon: GitBranch,
    title: 'Context Pipeline',
    description:
      'Resolve ranked context packages through authorization, rules, ranking, and budget fitting.',
    href: ROUTES.pipeline,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: Search,
    title: 'Hybrid Retrieval',
    description: 'Search across graph, semantic, and lexical signals with Reciprocal Rank Fusion.',
    href: ROUTES.retrieval,
    color: 'text-sky-600 dark:text-sky-400',
  },
  {
    icon: ShieldCheck,
    title: 'Authorization Engine',
    description: 'RBAC, compliance clearance, and per-node access control enforced at every layer.',
    href: ROUTES.permissions,
    color: 'text-rose-600 dark:text-rose-400',
  },
  {
    icon: BrainCircuit,
    title: 'AI Chat',
    description:
      'Conversational AI grounded in authorized context — every response cites its sources.',
    href: ROUTES.ai,
    color: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    icon: Bot,
    title: 'Agent Orchestration',
    description: 'Autonomous agents that plan, retrieve context, use tools, and verify their work.',
    href: ROUTES.agents,
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
]

// ---------------------------------------------------------------------------
// Metric card
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function OverviewPage() {
  const { context, selectedUser, bootstrap } = useApi()
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

  const stats = React.useMemo(() => {
    const completed = (runs.data ?? []).filter(
      (r) => r.status === 'completed' && r.metrics !== null,
    )
    if (completed.length === 0) return null
    const totalDuration = completed.reduce((sum, r) => sum + (r.metrics?.totalDurationMs ?? 0), 0)
    const totalCandidates = completed.reduce(
      (sum, r) => sum + (r.metrics?.includedCandidates ?? 0),
      0,
    )
    return {
      runCount: completed.length,
      avgDuration: totalDuration / completed.length,
      avgCandidates: totalCandidates / completed.length,
    }
  }, [runs.data])

  const hasData = (nodes.data ?? 0) > 0 || (runs.data ?? []).length > 0

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-indigo-500/5 via-transparent to-fuchsia-500/5 p-6 md:p-8">
        <div className="relative z-10">
          <PageHeader
            title={`Welcome to ContextGraph${selectedUser !== null ? `, ${selectedUser.name}` : ''}`}
            description="Your enterprise context intelligence platform — manage knowledge, enforce authorization, assemble context, and power AI with grounded, policy-compliant information."
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {context !== null && (
              <Badge variant="outline" className="gap-1.5">
                <ShieldCheck className="size-3" />
                {context.role} · {context.permissionLevel} · {context.complianceClearance}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">
              {bootstrap?.workspaceName ?? 'Workspace'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick start — shown when there's no data */}
      {!hasData && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
              <Play className="text-primary size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Get started with ContextGraph</p>
              <p className="text-muted-foreground max-w-md text-sm">
                Your workspace is ready. Start by adding knowledge nodes, uploading documents, or
                running the pipeline to see how context assembly works.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link href={ROUTES.knowledge}>
                  <Library className="mr-1.5 size-3.5" />
                  Add knowledge
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={ROUTES.ingestion}>
                  <FileUp className="mr-1.5 size-3.5" />
                  Upload documents
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={ROUTES.pipeline}>
                  <GitBranch className="mr-1.5 size-3.5" />
                  Run pipeline
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key metrics — primary metrics get accent border and larger text */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Knowledge nodes"
          value={nodes.data !== undefined ? String(nodes.data) : '—'}
          icon={Waypoints}
          hint="In this workspace"
          variant="primary"
        />
        <MetricCard
          label="Relationships"
          value={edges.data !== undefined ? String(edges.data) : '—'}
          icon={Boxes}
          hint="Typed graph edges"
          variant="primary"
        />
        <MetricCard
          label="Active rules"
          value={rules.data !== undefined ? String(rules.data) : '—'}
          icon={ShieldCheck}
          hint="Context filtering rules"
          variant="secondary"
        />
        <MetricCard
          label="Pipeline runs"
          value={runs.data?.length !== undefined ? String(runs.data.length) : '—'}
          icon={Gauge}
          hint={
            stats !== null
              ? `Avg ${formatDuration(stats.avgDuration)} per run`
              : 'Run the pipeline to start'
          }
          variant="secondary"
        />
      </div>

      {/* Feature highlights */}
      <div>
        <h2 className="mb-3 text-sm font-medium">Platform capabilities</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Link key={feature.title} href={feature.href}>
              <Card className="hover:border-border/80 hover:bg-muted/30 transition-colors">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <feature.icon className={`mt-0.5 size-4 shrink-0 ${feature.color}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{feature.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity + Health */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent pipeline runs</CardTitle>
              <CardDescription>
                Latest context assembly executions in this workspace.
              </CardDescription>
            </div>
            {(runs.data ?? []).length > 0 && (
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.pipeline}>
                  View all
                  <ArrowUpRight className="ml-1 size-3" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {runs.isPending ? (
              <Skeleton className="h-40 w-full" />
            ) : (runs.data ?? []).length === 0 ? (
              <EmptyState
                icon={GitBranch}
                title="No pipeline runs yet"
                description="Run the context pipeline to see execution traces, ranked candidates, and rule explanations here."
              />
            ) : (
              <ul className="space-y-1.5">
                {(runs.data ?? []).slice(0, 5).map((run) => (
                  <li key={run.requestId}>
                    <Link
                      href={pipelineRunDetail(run.requestId)}
                      className="hover:bg-muted/60 flex items-center gap-3 rounded-md px-2 py-1.5 text-xs transition-colors"
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
                      <span className="truncate">{formatDateTime(run.createdAt)}</span>
                      <span className="ml-auto shrink-0 font-mono text-[10px]">
                        {run.metrics?.includedCandidates ?? '—'} candidates
                      </span>
                      <ArrowUpRight className="text-muted-foreground/60 size-3 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <HealthStatusCard />
        </div>
      </div>
    </div>
  )
}
