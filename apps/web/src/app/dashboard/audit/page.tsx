'use client'

import * as React from 'react'
import { FileClock, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { useAuditEntries, useAuditSummary } from '@/hooks/use-api-query'

const ENTITY_TYPES = [
  'ORGANIZATION',
  'WORKSPACE',
  'DEPARTMENT',
  'USER',
  'KNOWLEDGE_NODE',
  'GRAPH_EDGE',
  'PERMISSION_PROFILE',
  'CONTEXT_RULE',
] as const

export default function AuditPage() {
  const { selectedUser } = useApi()
  const [entityType, setEntityType] = React.useState<string>('')

  const summary = useAuditSummary()
  const entries = useAuditEntries({ entityType: entityType || undefined, limit: 50 })

  const isAdminViewer = selectedUser?.role === 'ADMIN' || selectedUser?.role === 'AUDITOR'

  const topActions = React.useMemo(() => {
    const actions = summary.data?.eventsByAction ?? {}
    return Object.entries(actions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
  }, [summary.data])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit"
        description="Immutable, org-scoped audit trail of every platform action — deny decisions, permission changes, and knowledge-node events."
      >
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="size-3" />
          {isAdminViewer ? 'ADMIN / AUDITOR view' : 'Limited view'}
        </Badge>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total audit events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.isPending ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-3xl font-semibold tracking-tight">
                {summary.data?.totalAuditEvents ?? 0}
              </span>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top actions</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.isPending ? (
              <Skeleton className="h-16 w-full" />
            ) : topActions.length === 0 ? (
              <p className="text-muted-foreground text-xs">No events recorded yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {topActions.map(([action, count]) => (
                  <Badge key={action} variant="outline" className="gap-1.5 font-mono text-[10px]">
                    {action}
                    <span className="text-muted-foreground">×{count}</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event log</CardTitle>
          <CardDescription>
            Filter by entity type — the log is read directly from{' '}
            <code className="text-muted-foreground">GET /audit</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
              aria-label="Filter by entity type"
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 items-center rounded-lg border px-2.5 text-sm outline-none"
            >
              <option value="">All entity types</option>
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void entries.refetch()}
              disabled={entries.isFetching}
            >
              {entries.isFetching ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Refresh
            </Button>
          </div>

          {entries.isError && (
            <p className="text-destructive text-xs">
              {entries.error?.message ?? 'Failed to load the audit log'} — the audit log requires an
              ADMIN or AUDITOR role.
            </p>
          )}

          {entries.isPending ? (
            <TableSkeleton rows={5} columns={3} />
          ) : (entries.data ?? []).length === 0 ? (
            <EmptyState
              icon={FileClock}
              title="No audit events"
              description="Actions such as knowledge-node create/update and permission changes are recorded here."
            />
          ) : (
            <ul className="divide-y" aria-live="polite">
              {(entries.data ?? []).map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 py-2.5 text-sm">
                  <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-[10px]">
                    {entry.action}
                  </Badge>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate font-mono text-xs">
                      {entry.entityType}
                      {entry.entityId !== '' ? ` / ${entry.entityId}` : ''}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {entry.actorId !== null ? `actor ${entry.actorId}` : 'system'} ·{' '}
                      {new Date(entry.occurredAt).toLocaleString()}
                    </p>
                  </div>
                  {entry.ipAddress !== null && (
                    <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                      {entry.ipAddress}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
