'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  Bot,
  GitBranch,
  Shield,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Activity,
  Lock,
  Cpu,
  Scale,
  UserCog,
} from 'lucide-react'
import Link from 'next/link'
import { ROUTES } from '@/constants'

interface GovernanceOverview {
  totalUsers: number
  activeUsers: number
  activeAgents: number
  activeWorkflows: number
  activePolicies: number
  securityEvents: number
  monthlyCost: number
  budgetUsage: number
  failedExecutions: number
  authorizationDenials: number
}

function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'default',
}: {
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
  variant?: 'default' | 'warning' | 'danger' | 'success'
}) {
  const variantStyles = {
    default: 'border-border',
    warning: 'border-amber-500/30 bg-amber-50/5 dark:bg-amber-950/10',
    danger: 'border-red-500/30 bg-red-50/5 dark:bg-red-950/10',
    success: 'border-emerald-500/30 bg-emerald-50/5 dark:bg-emerald-950/10',
  }

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {description && <p className="text-muted-foreground mt-1 text-xs">{description}</p>}
      </CardContent>
    </Card>
  )
}

export default function GovernancePage() {
  const { data: overview, isLoading } = useQuery<GovernanceOverview>({
    queryKey: ['governance', 'overview'],
    queryFn: async () => {
      const res = await fetch('/api/v1/governance/overview')
      if (!res.ok) throw new Error('Failed to fetch governance overview')
      return res.json()
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Governance</h1>
        <p className="text-muted-foreground">
          Enterprise control plane — manage policies, agents, models, budgets, and security
        </p>
      </div>

      {/* Executive Summary Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : overview ? (
          <>
            <MetricCard
              title="Active Users"
              value={overview.activeUsers}
              icon={Users}
              description={`${overview.totalUsers} total members`}
              variant="success"
            />
            <MetricCard
              title="Active Agents"
              value={overview.activeAgents}
              icon={Bot}
              description="Registered agent definitions"
            />
            <MetricCard
              title="Active Policies"
              value={overview.activePolicies}
              icon={Shield}
              description="Governance policies active"
            />
            <MetricCard
              title="Monthly AI Cost"
              value={`$${overview.monthlyCost.toFixed(2)}`}
              icon={DollarSign}
              description="Last 30 days"
              variant={overview.monthlyCost > 100 ? 'warning' : 'default'}
            />
            <MetricCard
              title="Security Events"
              value={overview.securityEvents}
              icon={Lock}
              description="Audit events recorded"
              variant={overview.securityEvents > 0 ? 'warning' : 'default'}
            />
            <MetricCard
              title="Auth Denials"
              value={overview.authorizationDenials}
              icon={AlertTriangle}
              description="Access denied events"
              variant={overview.authorizationDenials > 0 ? 'danger' : 'success'}
            />
            <MetricCard
              title="Active Workflows"
              value={overview.activeWorkflows}
              icon={GitBranch}
              description="Orchestration workflows"
            />
            <MetricCard
              title="Budget Usage"
              value={`${overview.budgetUsage.toFixed(1)}%`}
              icon={TrendingUp}
              description="Budget utilization"
              variant={
                overview.budgetUsage > 80
                  ? 'danger'
                  : overview.budgetUsage > 60
                    ? 'warning'
                    : 'default'
              }
            />
          </>
        ) : null}
      </div>

      {/* Quick Navigation */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href={ROUTES.governancePolicies}>
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="text-primary h-5 w-5" />
                Policy Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Create and manage governance policies for access, agents, models, and security.
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="secondary">ACCESS</Badge>
                <Badge variant="secondary">AGENT</Badge>
                <Badge variant="secondary">MODEL</Badge>
                <Badge variant="secondary">COST</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={ROUTES.governanceModels}>
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="text-primary h-5 w-5" />
                Model Governance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Configure model providers, allowlists, data classification, and external LLM
                policies.
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="secondary">ALLOWLISTS</Badge>
                <Badge variant="secondary">CLASSIFICATION</Badge>
                <Badge variant="secondary">EXTERNAL LLM</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={ROUTES.governanceBudgets}>
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="text-primary h-5 w-5" />
                Budget & Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Track AI costs, set budgets, and enforce spending limits.
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="secondary">BUDGETS</Badge>
                <Badge variant="secondary">USAGE TRACKING</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={ROUTES.governanceTeams}>
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCog className="text-primary h-5 w-5" />
                Teams & Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Manage team memberships, custom roles, and granular permissions.
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="secondary">RBAC</Badge>
                <Badge variant="secondary">CUSTOM ROLES</Badge>
                <Badge variant="secondary">TEAMS</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={ROUTES.audit}>
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="text-primary h-5 w-5" />
                Audit & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Immutable audit logs with tamper-evident hash chain and compliance readiness.
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="secondary">HASH CHAIN</Badge>
                <Badge variant="secondary">IMMUTABLE</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={ROUTES.settings}>
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="text-primary h-5 w-5" />
                Organization Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Configure organization-level settings for models, security, and data retention.
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="secondary">SETTINGS</Badge>
                <Badge variant="secondary">SECURITY</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
