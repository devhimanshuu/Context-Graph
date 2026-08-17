'use client'

import * as React from 'react'
import { BarChart3, FileClock, ShieldCheck, Tags } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { useAnalyticsSummary, useKnowledgeNodes } from '@/hooks/use-api-query'
import { COMPLIANCE_TAG_DESCRIPTIONS, COMPLIANCE_TAG_VALUES } from '@/constants/domain'
import type { KnowledgeNode } from '@/lib/api/types'

export default function AnalyticsPage() {
  const { selectedUser, bootstrap } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null
  const summary = useAnalyticsSummary()
  const nodes = useKnowledgeNodes(workspaceId)
  const isAdminViewer = selectedUser?.role === 'ADMIN' || selectedUser?.role === 'AUDITOR'

  const actions = React.useMemo(
    () => Object.entries(summary.data?.eventsByAction ?? {}).sort(([, a], [, b]) => b - a),
    [summary.data],
  )
  const maxCount = actions.length > 0 ? (actions[0]?.[1] ?? 0) : 0

  /** Count of knowledge nodes carrying each compliance tag (real workspace data). */
  const tagCounts = React.useMemo(() => countNodesByTag(nodes.data ?? []), [nodes.data])
  const maxTagCount = Math.max(1, ...COMPLIANCE_TAG_VALUES.map((tag) => tagCounts[tag] ?? 0))

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
            {summary.isPending ? (
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
            {summary.isPending ? (
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
          {summary.isPending ? (
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Tags className="text-muted-foreground size-4" />
            Compliance tags
            {!nodes.isPending && nodes.data !== undefined && (
              <Badge variant="secondary" className="ml-auto font-mono text-[10px]">
                {nodes.data.length} nodes
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            How many knowledge nodes in this workspace carry each compliance classification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nodes.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : (nodes.data ?? []).length === 0 ? (
            <EmptyState
              icon={Tags}
              title="No knowledge nodes"
              description="Nodes with compliance tags appear here once the workspace has knowledge content."
            />
          ) : (
            <ul className="space-y-3">
              {COMPLIANCE_TAG_VALUES.map((tag) => {
                const count = tagCounts[tag] ?? 0
                if (count === 0) return null
                return (
                  <li key={tag} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="font-mono font-medium">{tag}</span>
                        <span
                          className="text-muted-foreground truncate text-[10px]"
                          title={COMPLIANCE_TAG_DESCRIPTIONS[tag]}
                        >
                          {COMPLIANCE_TAG_DESCRIPTIONS[tag]}
                        </span>
                      </span>
                      <span className="text-muted-foreground shrink-0 font-mono">{count}</span>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${Math.max(4, (count / maxTagCount) * 100)}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Counts knowledge nodes per compliance tag. A node contributes to every tag it carries. */
function countNodesByTag(nodes: readonly KnowledgeNode[]): Partial<Record<string, number>> {
  const counts: Partial<Record<string, number>> = {}
  for (const node of nodes) {
    for (const tag of node.complianceTags) {
      counts[tag] = (counts[tag] ?? 0) + 1
    }
  }
  return counts
}
