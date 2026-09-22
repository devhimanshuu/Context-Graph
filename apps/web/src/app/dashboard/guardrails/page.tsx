'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useApi } from '@/components/dashboard/api-provider'
import { useApiQuery } from '@/hooks/use-api-query'
import type { GuardrailActionRecord, GuardrailsOverview } from '@/lib/api/types'
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  RefreshCw,
  ArrowRight,
  Layers,
} from 'lucide-react'

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
}

export default function GuardrailsPage() {
  const router = useRouter()
  const { client } = useApi()
  const [testAction, setTestAction] = useState('')
  const [testTargetType, setTestTargetType] = useState('')
  const [testTargetId, setTestTargetId] = useState('')
  const [testResult, setTestResult] = useState<unknown>(null)
  const [testLoading, setTestLoading] = useState(false)

  const actionsQuery = useApiQuery<GuardrailActionRecord[]>(['guardrails-actions'], (api) =>
    api.guardrailsActions(),
  )
  const overviewQuery = useApiQuery<GuardrailsOverview>(['guardrails-overview'], (api) =>
    api.guardrailsOverview(),
  )
  const loading = actionsQuery.isLoading || overviewQuery.isLoading
  const refresh = () => {
    void actionsQuery.refetch()
    void overviewQuery.refetch()
  }

  const runTest = async () => {
    if (!testAction || !testTargetType || client === null) return
    setTestLoading(true)
    setTestResult(null)
    try {
      const data = await client.guardrailsCheckAction({
        action: testAction,
        targetType: testTargetType,
        targetId: testTargetId || undefined,
      })
      setTestResult(data)
    } catch {
      setTestResult({ error: 'Failed to execute check' })
    } finally {
      setTestLoading(false)
    }
  }

  const actions = actionsQuery.data ?? []
  const overview = overviewQuery.data ?? null

  const totalChecks = overview?.totalChecks ?? 0
  const allowed = overview?.allowed ?? 0
  const denied = overview?.denied ?? 0
  const approvalReq = overview?.approvalRequired ?? 0
  const avgLatency = overview?.averageEvaluationTimeMs ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guardrails</h1>
          <p className="text-muted-foreground mt-1">
            Deterministic action authorization engine — answers &quot;Is this agent allowed to
            perform this action?&quot;
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChecks}</div>
            <p className="text-muted-foreground text-xs">All action evaluations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allowed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{allowed}</div>
            <p className="text-muted-foreground text-xs">
              {totalChecks > 0 ? `${Math.round((allowed / totalChecks) * 100)}%` : '—'} of checks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denied</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{denied}</div>
            <p className="text-muted-foreground text-xs">
              {totalChecks > 0 ? `${Math.round((denied / totalChecks) * 100)}%` : '—'} of checks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Approval</CardTitle>
            <HelpCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{approvalReq}</div>
            <p className="text-muted-foreground text-xs">Human approval required</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Eval Time</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLatency}ms</div>
            <p className="text-muted-foreground text-xs">Per guardrail evaluation</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Registry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Action Registry
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Registered actions with risk levels, required capabilities, and approval requirements
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center">
              Loading actions...
            </div>
          ) : actions.length === 0 ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center">
              No actions registered
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((action) => (
                <div
                  key={action.actionId}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {action.riskLevel === 'CRITICAL' ? (
                      <ShieldX className="h-5 w-5 text-red-500" />
                    ) : action.riskLevel === 'HIGH' ? (
                      <ShieldAlert className="h-5 w-5 text-orange-500" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    )}
                    <div>
                      <div className="font-medium">{action.name}</div>
                      <div className="text-muted-foreground text-xs">{action.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={RISK_COLORS[action.riskLevel] ?? ''}>
                      {action.riskLevel}
                    </Badge>
                    {action.approvalRequired && (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-700"
                      >
                        Approval Required
                      </Badge>
                    )}
                    <div className="flex gap-1">
                      {action.targetTypes.slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                      {action.targetTypes.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{action.targetTypes.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive Policy Tester */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Policy Tester
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Test whether a specific action is allowed under the current guardrails
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Action</label>
              <select
                value={testAction}
                onChange={(e) => setTestAction(e.target.value)}
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Select action...</option>
                {actions.map((a) => (
                  <option key={a.actionId} value={a.actionId}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Target Type</label>
              <input
                type="text"
                value={testTargetType}
                onChange={(e) => setTestTargetType(e.target.value)}
                placeholder="e.g. KNOWLEDGE_NODE"
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Target ID (optional)</label>
              <input
                type="text"
                value={testTargetId}
                onChange={(e) => setTestTargetId(e.target.value)}
                placeholder="UUID"
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => void runTest()}
                disabled={!testAction || !testTargetType || testLoading}
                className="w-full"
              >
                {testLoading ? 'Evaluating...' : 'Run Check'}
              </Button>
            </div>
          </div>

          {testResult !== null && (
            <div className="mt-4 rounded-lg border p-4">
              <pre className="overflow-x-auto text-sm">{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guardrail Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Guardrail Evaluation Pipeline</CardTitle>
          <p className="text-muted-foreground text-sm">
            Guardrails evaluate in priority order — critical failures short-circuit immediately
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { name: 'Authentication', priority: 10, icon: '🔑' },
              { name: 'Capability', priority: 20, icon: '🎯' },
              { name: 'Organization', priority: 30, icon: '🏢' },
              { name: 'Resource Existence', priority: 40, icon: '📦' },
              { name: 'Resource Scope', priority: 50, icon: '🔒' },
              { name: 'Permission Level', priority: 60, icon: '📊' },
              { name: 'Compliance', priority: 70, icon: '📋' },
              { name: 'Classification', priority: 80, icon: '🏷️' },
              { name: 'Resource State', priority: 90, icon: '🔄' },
              { name: 'Risk', priority: 100, icon: '⚠️' },
              { name: 'Policy Constraints', priority: 110, icon: '📜' },
              { name: 'Approval', priority: 120, icon: '✋' },
              { name: 'Time Restrictions', priority: 130, icon: '⏰' },
              { name: 'Budget', priority: 140, icon: '💰' },
            ].map((g, i, arr) => (
              <div key={g.name} className="flex items-center gap-2">
                <div className="bg-muted/50 flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs">
                  <span>{g.icon}</span>
                  <span className="font-medium">{g.name}</span>
                  <span className="text-muted-foreground">({g.priority})</span>
                </div>
                {i < arr.length - 1 && <ArrowRight className="text-muted-foreground h-3 w-3" />}
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-4 text-xs">
            Decision resolution: DENY overrides ALLOW → REQUIRE_APPROVAL overrides automatic ALLOW →
            Most severe failure wins.
          </p>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card
          className="hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => router.push(ROUTES.pipeline)}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <ShieldCheck className="text-primary h-8 w-8" />
            <div>
              <div className="font-medium">Pipeline</div>
              <div className="text-muted-foreground text-sm">
                View pipeline context authorization
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => router.push(ROUTES.agents)}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <ShieldAlert className="text-primary h-8 w-8" />
            <div>
              <div className="font-medium">Agents</div>
              <div className="text-muted-foreground text-sm">View agent execution guardrails</div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => router.push(ROUTES.governance)}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <ShieldX className="text-primary h-8 w-8" />
            <div>
              <div className="font-medium">Governance</div>
              <div className="text-muted-foreground text-sm">
                View organization governance settings
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
