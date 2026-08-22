'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/dashboard/stat-card'
import Link from 'next/link'
import { Bot, Play, CheckCircle2, XCircle, Clock, Zap, Shield, DollarSign } from 'lucide-react'

interface AgentExecution {
  executionId: string
  status: string
  userRequest: string
  finalResponse: string | null
  iterations: number
  toolCalls: number
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  durationMs: number
  error: string | null
  createdAt: string
  completedAt: string | null
}

interface AgentAnalytics {
  totalExecutions: number
  completedExecutions: number
  failedExecutions: number
  completionRate: number
  averageDurationMs: number
  averageIterations: number
  averageToolCalls: number
  totalToolCalls: number
  policyDenials: number
  totalInputTokens: number
  totalOutputTokens: number
  estimatedTotalCost: number
  verificationFailures: number
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  FAILED: 'bg-red-500/10 text-red-700 dark:text-red-400',
  CANCELLED: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400',
  TIMEOUT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  POLICY_BLOCKED: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  PENDING: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={STATUS_COLORS[status] ?? ''}>
      {status}
    </Badge>
  )
}

export default function AgentsPage() {
  const { data: analytics } = useQuery<AgentAnalytics>({
    queryKey: ['agent-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/v1/agents/analytics')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return res.json()
    },
  })

  const { data: executionsData } = useQuery<{ executions: AgentExecution[]; total: number }>({
    queryKey: ['agent-executions'],
    queryFn: async () => {
      const res = await fetch('/api/v1/agents/executions')
      if (!res.ok) throw new Error('Failed to fetch executions')
      return res.json()
    },
  })

  const executions = executionsData?.executions ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Orchestration</h1>
          <p className="text-muted-foreground">
            Run AI agents with ContextGraph authorization and context management
          </p>
        </div>
        <Link href="/dashboard/agents/run">
          <Button>
            <Play className="mr-2 h-4 w-4" />
            Run Agent
          </Button>
        </Link>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Executions"
          value={analytics !== undefined ? String(analytics.totalExecutions) : '—'}
          icon={Bot}
        />
        <StatCard
          label="Completion Rate"
          value={analytics !== undefined ? `${(analytics.completionRate * 100).toFixed(0)}%` : '—'}
          icon={CheckCircle2}
        />
        <StatCard
          label="Avg Duration"
          value={
            analytics !== undefined ? `${(analytics.averageDurationMs / 1000).toFixed(1)}s` : '—'
          }
          icon={Clock}
        />
        <StatCard
          label="Total Cost"
          value={analytics !== undefined ? `$${analytics.estimatedTotalCost.toFixed(4)}` : '—'}
          icon={DollarSign}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Tool Calls"
          value={analytics !== undefined ? String(analytics.totalToolCalls) : '—'}
          icon={Zap}
        />
        <StatCard
          label="Avg Iterations"
          value={analytics !== undefined ? analytics.averageIterations.toFixed(1) : '—'}
          icon={Clock}
        />
        <StatCard
          label="Policy Denials"
          value={analytics !== undefined ? String(analytics.policyDenials) : '—'}
          icon={Shield}
        />
        <StatCard
          label="Verification Failures"
          value={analytics !== undefined ? String(analytics.verificationFailures) : '—'}
          icon={XCircle}
        />
        <StatCard
          label="Failed Executions"
          value={analytics !== undefined ? String(analytics.failedExecutions) : '—'}
          icon={XCircle}
        />
      </div>

      {/* Executions List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
          <CardDescription>
            Agent executions are tracked with full trace, tool calls, and verification results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">
              No agent executions yet. Run your first agent to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((exec) => (
                <Link
                  key={exec.executionId}
                  href={`/dashboard/agents/${exec.executionId}`}
                  className="hover:bg-muted/50 block rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={exec.status} />
                        <span className="truncate text-sm font-medium">{exec.userRequest}</span>
                      </div>
                      <div className="text-muted-foreground mt-1 flex gap-4 text-xs">
                        <span>{exec.toolCalls} tool calls</span>
                        <span>{exec.iterations} iterations</span>
                        <span>{(exec.durationMs / 1000).toFixed(1)}s</span>
                        <span>${exec.estimatedCost.toFixed(4)}</span>
                      </div>
                    </div>
                    <div className="text-muted-foreground text-right text-xs">
                      {new Date(exec.createdAt).toLocaleString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
