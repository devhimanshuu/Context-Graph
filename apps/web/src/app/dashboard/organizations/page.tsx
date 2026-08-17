'use client'

import * as React from 'react'
import { Boxes, Building2, Landmark, ScrollText, ShieldCheck, Users, Waypoints } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import {
  useCurrentOrganization,
  useDepartments,
  useGraphEdges,
  useKnowledgeNodes,
  useUsers,
} from '@/hooks/use-api-query'
import { cn } from '@/lib/utils'

const INDUSTRY_TONE: Record<string, string> = {
  HEALTHCARE: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  FINANCE: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  LEGAL: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  TECHNOLOGY: 'border-violet-500/40 text-violet-600 dark:text-violet-400',
}

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  ONBOARDING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  SUSPENDED: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
  ARCHIVED: 'text-muted-foreground',
}

export default function OrganizationsPage() {
  const { bootstrap, selectedUser } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null
  const organizationId = bootstrap?.organizationId ?? null

  const organization = useCurrentOrganization()
  const nodes = useKnowledgeNodes(workspaceId)
  const edges = useGraphEdges(workspaceId)
  const departments = useDepartments(organizationId)
  const users = useUsers()

  const isAdmin = selectedUser?.role === 'ADMIN' || selectedUser?.role === 'HOD'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization"
        description="Your tenant's profile and footprint — every number is fetched live from the organization-scoped APIs."
      >
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="size-3" />
          {isAdmin ? 'ADMIN / HOD view' : 'Tenant view'}
        </Badge>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Landmark className="text-muted-foreground size-4" />
              Profile
            </CardTitle>
            <CardDescription>
              Trusted server-side tenant record from{' '}
              <code className="text-muted-foreground">GET /organizations/current</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {organization.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : organization.data === undefined ? (
              <EmptyState
                icon={Landmark}
                title="No organization"
                description="Connect to the API to load the tenant profile."
              />
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-semibold tracking-tight">{organization.data.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-medium',
                        INDUSTRY_TONE[organization.data.industry] ?? '',
                      )}
                    >
                      {organization.data.industry}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-medium',
                        STATUS_TONE[organization.data.status] ?? '',
                      )}
                    >
                      {organization.data.status}
                    </Badge>
                  </div>
                </div>
                <dl className="text-xs">
                  <Row label="Slug" value={organization.data.slug} mono />
                  <Row label="Tenant id" value={organization.data.id} mono />
                  <Row
                    label="Created"
                    value={new Date(organization.data.createdAt).toLocaleDateString()}
                  />
                </dl>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <StatCard
            icon={Waypoints}
            label="Knowledge nodes"
            value={nodes.data?.length ?? null}
            loading={nodes.isPending}
          />
          <StatCard
            icon={Boxes}
            label="Graph edges"
            value={edges.data?.length ?? null}
            loading={edges.isPending}
          />
          <StatCard
            icon={Users}
            label="Members"
            value={users.data?.length ?? null}
            loading={users.isPending}
          />
          <StatCard
            icon={Building2}
            label="Departments"
            value={departments.data?.length ?? null}
            loading={departments.isPending}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="text-muted-foreground size-4" />
              Departments
              {departments.data !== undefined && (
                <Badge variant="secondary" className="ml-auto font-mono text-[10px]">
                  {departments.data.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              The hierarchy that shapes department-level authorization — parents grant access to
              children.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {departments.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : (departments.data ?? []).length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No departments"
                description="Create departments in the Departments page."
              />
            ) : (
              <ul className="space-y-1.5">
                {(departments.data ?? []).map((department) => (
                  <li
                    key={department.id}
                    className="hover:bg-muted/40 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
                  >
                    <Building2 className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="font-medium">{department.name}</span>
                    <Badge variant="outline" className="font-mono text-[9px] font-normal">
                      {department.code}
                    </Badge>
                    <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                      L{department.hierarchyLevel}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ScrollText className="text-muted-foreground size-4" />
              Recent activity
            </CardTitle>
            <CardDescription>What this organization has done through the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={ScrollText}
              title="Live activity"
              description="Context resolutions, rule runs and graph mutations will appear here as the workspace is used — see the Audit page for the full trail."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | null
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
        <Icon className="text-muted-foreground size-4 shrink-0" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <span className="text-2xl font-semibold tracking-tight">{value ?? '—'}</span>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('truncate font-medium', mono && 'font-mono text-[11px]')} title={value}>
        {value}
      </dd>
    </div>
  )
}
