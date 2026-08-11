'use client'

import { Boxes, CircleCheck, Circle, ScrollText, ShieldCheck, Waypoints } from 'lucide-react'
import { EmptyState } from '@/components/dashboard/empty-state'
import { HealthStatusCard } from '@/components/dashboard/health-status-card'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { useApiData } from '@/hooks/use-api-data'
import { APP } from '@/constants'

const ROADMAP = [
  { label: 'Project foundation & architecture', done: true },
  { label: 'Database layer & domain model (schema, migrations, seed)', done: true },
  { label: 'Application layer — contracts, DI, pipeline blueprint', done: true },
  { label: 'Graph engine — BFS traversal, validation, reachability (NestJS)', done: true },
  { label: 'Authorization engine — RBAC, policies, compiled contexts (NestJS)', done: true },
  { label: 'Rule engine — deterministic filtering, explainability, metrics (NestJS)', done: true },
  { label: 'Permission-aware context assembly', done: false },
  { label: 'AI integrations & analytics', done: false },
] as const

/** Loads the counts that power the overview stat cards in parallel. */
function useOverviewStats() {
  const { client, bootstrap } = useApi()
  const nodes = useApiData<number>(
    async (api) => {
      if (bootstrap === null) return 0
      return (await api.knowledgeNodes(bootstrap.workspaceId)).length
    },
    [bootstrap?.workspaceId],
  )
  const edges = useApiData<number>(
    async (api) => {
      if (bootstrap === null) return 0
      return (await api.graphEdges(bootstrap.workspaceId)).length
    },
    [bootstrap?.workspaceId],
  )
  const rules = useApiData<number>(
    async (api) => {
      if (bootstrap === null) return 0
      return (await api.workspaceRules(bootstrap.workspaceId)).length
    },
    [bootstrap?.workspaceId],
  )
  return { client, nodes, edges, rules }
}

function LiveValue({ value }: { value: number | null }) {
  if (value === null) return <Skeleton className="h-8 w-12" />
  return <span className="text-2xl font-semibold tracking-tight">{value}</span>
}

export default function OverviewPage() {
  const { context, selectedUser } = useApi()
  const { nodes, edges, rules } = useOverviewStats()

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
            <LiveValue value={nodes.data} />
            <p className="text-muted-foreground text-xs">In the demo workspace</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">Edges</CardTitle>
            <Boxes className="text-muted-foreground size-4 shrink-0" />
          </CardHeader>
          <CardContent className="space-y-1">
            <LiveValue value={edges.data} />
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
            <LiveValue value={rules.data} />
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
              <EmptyState
                icon={Waypoints}
                title="Nothing yet"
                description="Graph traversals, rule evaluations and context assemblies will appear here in later phases."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
