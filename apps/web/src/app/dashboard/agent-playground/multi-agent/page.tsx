'use client'

import { useCallback, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  Play,
  Search,
  BarChart3,
  ShieldAlert,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
} from 'lucide-react'

import type { ReferenceRunResult } from '@contextgraph/types'

const AGENT_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; capabilities: readonly string[] }
> = {
  research: {
    icon: Search,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    capabilities: ['context.resolve', 'graph.read', 'knowledge.read'],
  },
  analysis: {
    icon: BarChart3,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    capabilities: ['context.resolve', 'graph.read', 'knowledge.read'],
  },
  decision: {
    icon: ShieldAlert,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    capabilities: ['context.resolve', 'action.check', 'knowledge.read'],
  },
  synthesis: {
    icon: FileText,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    capabilities: ['context.resolve'],
  },
}

const STATUS_ICON: Record<string, React.ElementType> = {
  COMPLETED: CheckCircle,
  FAILED: XCircle,
  RUNNING: Clock,
  SKIPPED: AlertTriangle,
  TIMED_OUT: AlertTriangle,
  PENDING: Clock,
}

export default function MultiAgentPage() {
  const [userRequest, setUserRequest] = useState(
    "Investigate the recent production incident and determine whether we can publish a new deployment decision based on the organization's policy.",
  )
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ReferenceRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleRun = useCallback(async () => {
    if (!userRequest.trim()) return
    setRunning(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/v1/reference-agents/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-token',
        },
        body: JSON.stringify({
          query: userRequest.trim(),
          action: 'PUBLISH_KNOWLEDGE',
          targetType: 'KNOWLEDGE_NODE',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data.data)
      } else {
        setError(data.error?.message ?? 'Request failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setRunning(false)
    }
  }, [userRequest])

  const handleCopy = useCallback(() => {
    if (result === null) return
    void navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Multi-Agent Demo</h1>
          <p className="text-muted-foreground mt-1">
            Reference multi-agent system demonstrating ContextGraph as shared trusted infrastructure
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />4 Agents · 1 Supervisor
        </Badge>
      </div>

      {/* Architecture Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Architecture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 text-xs">
            <div className="bg-muted/30 rounded-lg border px-3 py-2 text-center">
              <div className="font-medium">Supervisor</div>
              <div className="text-muted-foreground text-[10px]">orchestrates</div>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="rounded-lg border bg-blue-50 px-3 py-2 text-center">
              <div className="font-medium text-blue-700">Research</div>
              <div className="text-[10px] text-blue-600">resolve_context</div>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="rounded-lg border bg-amber-50 px-3 py-2 text-center">
              <div className="font-medium text-amber-700">Analysis</div>
              <div className="text-[10px] text-amber-600">analyze</div>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="rounded-lg border bg-red-50 px-3 py-2 text-center">
              <div className="font-medium text-red-700">Decision</div>
              <div className="text-[10px] text-red-600">check_action</div>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="rounded-lg border bg-emerald-50 px-3 py-2 text-center">
              <div className="font-medium text-emerald-700">Synthesis</div>
              <div className="text-[10px] text-emerald-600">final answer</div>
            </div>
          </div>
          <p className="text-muted-foreground mt-3 text-center text-[10px]">
            All agents communicate through ContextGraph — no direct DB access, no authority
            propagation
          </p>
        </CardContent>
      </Card>

      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">User Request</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={userRequest}
            onChange={(e) => setUserRequest(e.target.value)}
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            rows={3}
            placeholder="Ask about production incidents, deployment policies, or organizational knowledge..."
          />
          <div className="mt-3 flex items-center gap-2">
            <Button
              onClick={() => void handleRun()}
              disabled={!userRequest.trim() || running}
              className="gap-2"
              size="sm"
            >
              {running ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {running ? 'Running Multi-Agent Scenario...' : 'Run Multi-Agent Scenario'}
            </Button>
            {result !== null && (
              <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1 text-[10px]">
                {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy Result'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error !== null && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Agent Execution Flow */}
      {result !== null && (
        <div className="space-y-4">
          {/* Status Banner */}
          <div
            className={`flex items-center gap-3 rounded-lg border p-3 ${
              result.status === 'COMPLETED'
                ? 'border-emerald-200 bg-emerald-50'
                : result.status === 'FAILED'
                  ? 'border-red-200 bg-red-50'
                  : 'border-amber-200 bg-amber-50'
            }`}
          >
            {result.status === 'COMPLETED' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            ) : result.status === 'FAILED' ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            <div className="flex-1">
              <span
                className={`text-sm font-medium ${
                  result.status === 'COMPLETED'
                    ? 'text-emerald-700'
                    : result.status === 'FAILED'
                      ? 'text-red-700'
                      : 'text-amber-700'
                }`}
              >
                {result.status}
              </span>
              <span className="text-muted-foreground ml-2 text-xs">
                {result.totalDurationMs}ms total · run {result.runId.slice(0, 8)}…
              </span>
            </div>
          </div>

          {/* Agent Flow Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Agent Execution Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.trace.map((step, i) => {
                  const cfg = AGENT_CONFIG[step.agent]
                  const Icon = cfg?.icon ?? Users
                  const StatusIcon = STATUS_ICON[step.status] ?? Clock
                  const isActive = activeStep === step.agent

                  return (
                    <div key={step.agent}>
                      <button
                        onClick={() => setActiveStep(isActive ? null : step.agent)}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                          cfg?.bg ?? 'bg-muted/30'
                        } ${isActive ? 'ring-primary/30 ring-2' : ''}`}
                      >
                        <Icon
                          className={`h-5 w-5 shrink-0 ${cfg?.color ?? 'text-muted-foreground'}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">
                              {step.agent} Agent
                            </span>
                            <Badge
                              variant={
                                step.status === 'COMPLETED'
                                  ? 'default'
                                  : step.status === 'FAILED'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                              className="text-[10px]"
                            >
                              {step.status}
                            </Badge>
                            <span className="text-muted-foreground text-[10px]">
                              {step.durationMs}ms
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-0.5 text-xs">{step.summary}</p>
                        </div>
                        <StatusIcon
                          className={`h-4 w-4 shrink-0 ${
                            step.status === 'COMPLETED'
                              ? 'text-emerald-500'
                              : step.status === 'FAILED'
                                ? 'text-red-500'
                                : 'text-muted-foreground'
                          }`}
                        />
                      </button>

                      {/* Expanded Detail */}
                      {isActive && (
                        <div className="mt-1 ml-8 rounded border p-3 text-xs">
                          <div className="mb-2 font-medium">Capabilities</div>
                          <div className="mb-2 flex flex-wrap gap-1">
                            {cfg?.capabilities.map((cap) => (
                              <Badge key={cap} variant="outline" className="font-mono text-[9px]">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                          {step.error !== null && (
                            <div className="rounded border border-red-200 bg-red-50 p-2 text-red-700">
                              Error: {step.error}
                            </div>
                          )}
                          {step.toolCalls.length > 0 && (
                            <div>
                              <div className="mb-1 font-medium">Tool Calls</div>
                              {step.toolCalls.map((tc, j) => (
                                <div key={j} className="font-mono text-[10px]">
                                  → {tc}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Arrow between agents */}
                      {i < result.trace.length - 1 && (
                        <div className="flex justify-center py-1">
                          <div className="bg-border h-4 w-px" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action Decision Detail */}
          {result.decision?.actionCheck !== null && result.decision?.actionCheck !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ShieldAlert className="h-4 w-4" />
                  Action Decision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        result.decision.actionCheck.decision === 'ALLOW'
                          ? 'default'
                          : result.decision.actionCheck.decision === 'DENY'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {result.decision.actionCheck.decision}
                    </Badge>
                    <Badge variant="outline">{result.decision.actionCheck.riskLevel} RISK</Badge>
                    <span className="text-muted-foreground text-xs">
                      {result.decision.actionCheck.action} on{' '}
                      {result.decision.actionCheck.targetType}
                    </span>
                  </div>
                  <p className="text-xs">{result.decision.actionCheck.explanation}</p>

                  {/* Guardrail Trace */}
                  {result.decision.actionCheck.trace.length > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-medium">Guardrail Trace</div>
                      <div className="space-y-1">
                        {result.decision.actionCheck.trace.map((step, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            {step.passed ? (
                              <CheckCircle className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                            <span className="w-32 font-medium">{step.guardrail}</span>
                            <span className="text-muted-foreground flex-1">{step.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Proposal */}
                  {result.decision.proposal !== null && result.decision.proposal !== undefined && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                      <div className="mb-1 text-xs font-medium text-emerald-700">
                        Knowledge Proposal
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-emerald-700">
                          {result.decision.proposal.decision}
                        </Badge>
                        {result.decision.proposal.nodeId !== null && (
                          <span className="text-muted-foreground font-mono text-[10px]">
                            node: {result.decision.proposal.nodeId.slice(0, 12)}…
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Synthesis Output */}
          {result.synthesis?.answer !== null && result.synthesis?.answer !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  Final Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-xs max-w-none text-xs">
                  <pre className="font-sans whitespace-pre-wrap">{result.synthesis.answer}</pre>
                </div>
                {result.synthesis.citations.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <div className="mb-1 text-xs font-medium">Citations</div>
                    <div className="space-y-1">
                      {result.synthesis.citations.map((cite, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          <span className="font-mono">{cite.nodeId.slice(0, 8)}…</span>
                          <span className="font-medium">{cite.title}</span>
                          <span className="text-muted-foreground">— {cite.source}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
