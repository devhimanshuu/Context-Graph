'use client'

import * as React from 'react'
import { BarChart3, FileClock, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { useApiData } from '@/hooks/use-api-data'
import type { AnalyticsSummary } from '@/lib/api/types'

export default function AnalyticsPage() {
  const { selectedUser } = useApi()
  const summary = useApiData<AnalyticsSummary>(async (api) => api.analyticsSummary(), [])
  const isAdminViewer = selectedUser?.role === 'ADMIN' || selectedUser?.role === 'AUDITOR'

  const actions = React.useMemo(
    () => Object.entries(summary.data?.eventsByAction ?? {}).sort(([, a], [, b]) => b - a),
    [summary.data],
  )
  const maxCount = actions.length > 0 ? (actions[0]?.[1] ?? 0) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Platform usage across the organization — fed by the audit event store."
      >
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="size-3" />
          {isAdminViewer ? 'ADMIN / AUDITOR view' : 'Limited view'}
        </Badge>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total audit events
            </CardTitle>
            <FileClock className="text-muted-foreground size-4 shrink-0" />
          </CardHeader>
          <CardContent>
            {summary.loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-3xl font-semibold tracking-tight">
                {summary.data?.totalAuditEvents ?? 0}
              </span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Distinct actions
            </CardTitle>
            <BarChart3 className="text-muted-foreground size-4 shrink-0" />
          </CardHeader>
          <CardContent>
            {summary.loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-3xl font-semibold tracking-tight">{actions.length}</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events by action</CardTitle>
          <CardDescription>
            Every audit action recorded for the organization, most frequent first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.loading ? (
            <Skeleton className="h-48 w-full" />
          ) : actions.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No data yet"
              description="Audit events appear as the platform is used."
            />
          ) : (
            <ul className="space-y-3">
              {actions.map(([action, count]) => (
                <li key={action} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono">{action}</span>
                    <span className="text-muted-foreground font-mono">{count}</span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{
                        width: `${maxCount === 0 ? 0 : Math.max(4, (count / maxCount) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
