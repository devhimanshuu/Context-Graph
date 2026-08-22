'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/dashboard/stat-card'
import { Bot, Clock, Zap, Shield, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ExecutionDetail {
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
  steps: StepDetail[]
  toolCallsList: ToolCallDetail[]
  observations: ObservationDetail[]
  verifications: VerificationDetail[]
  trace: TraceDetail[]
}

interface StepDetail {
  stepId: string
  stepIndex: number
  stepType: string
  purpose: string
  toolName: string | null
  status: string
  durationMs: number | null
  createdAt: string
  completedAt: string | null
}

interface ToolCallDetail {
  toolCallId: string
  toolName: string
  status: string
  failureReason: string | null
  policyDecision: string | null
  durationMs: number | null
  createdAt: string
  completedAt: string | null
}

interface ObservationDetail {
  observationId: string
  toolName: string
  summary: string
  createdAt: string
}

interface VerificationDetail {
  verificationId: string
  checkType: string
  status: string
  createdAt: string
}

interface TraceDetail {
  timestamp: string
  eventType: string
  summary: string
  stepIndex: number | null
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  FAILED: 'bg-red-500/10 text-red-700 dark:text-red-400',
  CANCELLED: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400',
  PASSED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
}

export default function AgentExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: execution, isLoading } = useQuery<ExecutionDetail>({
    queryKey: ['agent-execution', id],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/agents/executions/${id}?includeSteps=true&includeToolCalls=true&includeObservations=true&includeVerifications=true`,
      )
      if (!res.ok) throw new Error('Failed to fetch execution')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="border-muted border-t-primary h-8 w-8 animate-spin rounded-full border-4" />
      </div>
    )
  }

  if (execution === undefined) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Execution not found</p>
        <Link href="/dashboard/agents" className="text-primary mt-4 hover:underline">
          Back to Agents
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/agents"
            className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Execution Detail</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">{execution.userRequest}</p>
        </div>
        <Badge variant="secondary" className={STATUS_COLORS[execution.status] ?? ''}>
          {execution.status}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Duration"
          value={`${(execution.durationMs / 1000).toFixed(1)}s`}
          icon={Clock}
        />
        <StatCard label="Tool Calls" value={String(execution.toolCalls)} icon={Zap} />
        <StatCard label="Iterations" value={String(execution.iterations)} icon={Bot} />
        <StatCard label="Cost" value={`$${execution.estimatedCost.toFixed(4)}`} icon={Shield} />
      </div>

      {/* Final Response */}
      {execution.finalResponse !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Final Response</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{execution.finalResponse}</p>
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      {execution.steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Steps</CardTitle>
            <CardDescription>Execution plan steps and their outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {execution.steps.map((step) => (
                <div key={step.stepId} className="flex items-start gap-4 rounded-lg border p-4">
                  <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                    {step.stepIndex + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{step.stepType}</Badge>
                      <Badge variant="secondary" className={STATUS_COLORS[step.status] ?? ''}>
                        {step.status}
                      </Badge>
                      {step.toolName !== null && (
                        <span className="text-muted-foreground text-xs">Tool: {step.toolName}</span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">{step.purpose}</p>
                    {step.durationMs !== null && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Duration: {(step.durationMs / 1000).toFixed(2)}s
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tool Calls */}
      {execution.toolCallsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tool Calls</CardTitle>
            <CardDescription>All tool executions during this agent run</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {execution.toolCallsList.map((tc) => (
                <div
                  key={tc.toolCallId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="text-muted-foreground h-4 w-4" />
                    <span className="font-medium">{tc.toolName}</span>
                    <Badge variant="secondary" className={STATUS_COLORS[tc.status] ?? ''}>
                      {tc.status}
                    </Badge>
                    {tc.policyDecision !== null && (
                      <span className="text-muted-foreground text-xs">
                        Policy: {tc.policyDecision}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-3 text-xs">
                    {tc.failureReason !== null && (
                      <span className="text-red-500">{tc.failureReason}</span>
                    )}
                    {tc.durationMs !== null && <span>{(tc.durationMs / 1000).toFixed(2)}s</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observations */}
      {execution.observations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Observations</CardTitle>
            <CardDescription>
              Structured observations from tool executions — safe summaries only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {execution.observations.map((obs) => (
                <div key={obs.observationId} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{obs.toolName}</Badge>
                  </div>
                  <p className="mt-1 text-sm">{obs.summary}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verifications */}
      {execution.verifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Results</CardTitle>
            <CardDescription>
              Deterministic checks performed before returning the final answer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {execution.verifications.map((v) => (
                <div
                  key={v.verificationId}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  {v.status === 'PASSED' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">{v.checkType}</span>
                  <Badge variant="secondary" className={STATUS_COLORS[v.status] ?? ''}>
                    {v.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trace */}
      {execution.trace.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Execution Trace</CardTitle>
            <CardDescription>
              Timeline of safe execution summaries — no chain-of-thought is exposed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-4 pl-6">
              <div className="bg-border absolute top-0 bottom-0 left-2 w-px" />
              {execution.trace.map((entry, idx) => (
                <div key={idx} className="relative">
                  <div className="border-background bg-primary absolute top-1 -left-4 h-3 w-3 rounded-full border-2" />
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.eventType}
                      </Badge>
                      {entry.stepIndex !== null && (
                        <span className="text-muted-foreground text-xs">
                          Step {entry.stepIndex}
                        </span>
                      )}
                      <span className="text-muted-foreground ml-auto text-xs">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{entry.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
