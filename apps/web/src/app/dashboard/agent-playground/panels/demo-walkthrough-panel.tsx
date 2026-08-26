'use client'

import { useCallback, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ToolExec, ActivityEntry } from '@/hooks/use-playground'
import type {
  ResolveContextResult,
  CheckActionResult,
  ProposeNodeResult,
} from '@/lib/api/playground-types'
import {
  Play,
  CheckCircle,
  ChevronRight,
  Search,
  ShieldAlert,
  FileText,
  Zap,
  Rocket,
  RotateCcw,
} from 'lucide-react'

interface Props {
  workspaceId: string
  toolExec: ToolExec
  addEntry: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
}

type StepId =
  | 'intro'
  | 'resolve'
  | 'inspect_context'
  | 'check_action'
  | 'inspect_decision'
  | 'propose'
  | 'inspect_proposal'
  | 'observe_event'
  | 'complete'

interface StepDef {
  id: StepId
  title: string
  icon: React.ElementType
  description: string
}

const STEPS: StepDef[] = [
  { id: 'intro', title: 'Welcome', icon: Rocket, description: 'Overview of the demo scenario' },
  {
    id: 'resolve',
    title: 'Resolve Context',
    icon: Search,
    description: 'Retrieve governed organizational knowledge',
  },
  {
    id: 'inspect_context',
    title: 'Inspect Results',
    icon: CheckCircle,
    description: 'Review the returned context package',
  },
  {
    id: 'check_action',
    title: 'Check Action',
    icon: ShieldAlert,
    description: 'Evaluate if the agent can publish knowledge',
  },
  {
    id: 'inspect_decision',
    title: 'Inspect Decision',
    icon: ShieldAlert,
    description: 'Review the guardrail trace and decision',
  },
  {
    id: 'propose',
    title: 'Propose Node',
    icon: FileText,
    description: 'Submit a governed knowledge proposal',
  },
  {
    id: 'inspect_proposal',
    title: 'Inspect Proposal',
    icon: FileText,
    description: 'Review the proposal validation and decision',
  },
  {
    id: 'observe_event',
    title: 'Observe Event',
    icon: Zap,
    description: 'Watch for the NODE_PUBLISHED event in the stream',
  },
  {
    id: 'complete',
    title: 'Complete',
    icon: CheckCircle,
    description: 'Demo walkthrough complete',
  },
]

export function DemoWalkthrough({ workspaceId, toolExec, addEntry }: Props) {
  const { client, setResult, loading, setLoading, errors, setErrors } = toolExec
  const [currentStep, setCurrentStep] = useState<StepId>('intro')
  const [stepResults, setStepResults] = useState<{
    context?: ResolveContextResult
    decision?: CheckActionResult
    proposal?: ProposeNodeResult
  }>({})

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep)

  const goToNext = useCallback(() => {
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id)
    }
  }, [stepIndex])

  const goToPrev = useCallback(() => {
    const prevIndex = stepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id)
    }
  }, [stepIndex])

  const restart = useCallback(() => {
    setCurrentStep('intro')
    setStepResults({})
  }, [])

  // ── Step Actions ────────────────────────────────────────────────────────

  const runResolveContext = useCallback(async () => {
    if (client === null || !workspaceId) return
    setLoading((prev) => ({ ...prev, demo_resolve: true }))
    setErrors((prev) => ({ ...prev, demo_resolve: null }))
    const start = performance.now()
    try {
      const res = await client.playgroundResolveContext({
        query: 'post-incident deployment guidance and service restart procedures',
        workspaceId,
        topK: 5,
        tokenBudget: 2048,
        retrievalMode: 'bfs',
      })
      const durationMs = Math.round(performance.now() - start)
      const withDuration = { ...res, executionTimeMs: durationMs }
      setStepResults((prev) => ({ ...prev, context: withDuration }))
      setResult('resolveContext', withDuration)
      addEntry({
        type: 'tool_call',
        toolName: 'resolve_context',
        status: 'success',
        detail: `Demo: ${res.contextItems.length} items · ${res.summary.totalTokens} tokens`,
        durationMs,
        runId: res.pipelineRunId,
      })
      goToNext()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setErrors((prev) => ({ ...prev, demo_resolve: msg }))
      addEntry({
        type: 'tool_call',
        toolName: 'resolve_context',
        status: 'error',
        detail: `Demo: ${msg}`,
        durationMs: Math.round(performance.now() - start),
      })
    } finally {
      setLoading((prev) => ({ ...prev, demo_resolve: false }))
    }
  }, [client, workspaceId, setLoading, setErrors, setResult, addEntry, goToNext])

  const runCheckAction = useCallback(async () => {
    if (client === null) return
    setLoading((prev) => ({ ...prev, demo_check: true }))
    setErrors((prev) => ({ ...prev, demo_check: null }))
    const start = performance.now()
    try {
      const res = await client.playgroundCheckAction({
        action: 'PUBLISH_KNOWLEDGE',
        targetType: 'KNOWLEDGE_NODE',
        purpose: 'Publish deployment guidance discovered through context resolution',
      })
      const durationMs = Math.round(performance.now() - start)
      const withDuration = { ...res, executionTimeMs: durationMs }
      setStepResults((prev) => ({ ...prev, decision: withDuration }))
      setResult('checkAction', withDuration)
      addEntry({
        type: 'action_check',
        toolName: 'check_action',
        status: res.decision.toLowerCase(),
        detail: `Demo: PUBLISH_KNOWLEDGE → ${res.decision} (${res.riskLevel})`,
        durationMs,
      })
      goToNext()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setErrors((prev) => ({ ...prev, demo_check: msg }))
      addEntry({
        type: 'action_check',
        toolName: 'check_action',
        status: 'error',
        detail: `Demo: ${msg}`,
        durationMs: Math.round(performance.now() - start),
      })
    } finally {
      setLoading((prev) => ({ ...prev, demo_check: false }))
    }
  }, [client, setLoading, setErrors, setResult, addEntry, goToNext])

  const runProposeNode = useCallback(async () => {
    if (client === null || !workspaceId) return
    setLoading((prev) => ({ ...prev, demo_propose: true }))
    setErrors((prev) => ({ ...prev, demo_propose: null }))
    const start = performance.now()
    try {
      const contextItems = stepResults.context?.contextItems ?? []
      const firstItem = contextItems[0]
      const content = firstItem
        ? `Based on context "${firstItem.title}": Restarting service X after condition Y resolves the post-incident issue. This procedure was validated during incident INC-1842.`
        : 'Restarting service X after condition Y resolves post-incident issues. Validated during incident INC-1842.'
      const title = firstItem
        ? `Post-Incident: ${firstItem.title.slice(0, 80)}`
        : 'Post-Incident Deployment Procedure'

      const res = await client.playgroundProposeNode({
        nodeType: 'FACT',
        title,
        content,
        classification: 'INTERNAL',
        workspaceId,
        purpose: 'Capture post-incident deployment guidance for future reference',
        idempotencyKey: `demo_${Date.now()}`,
      })
      const durationMs = Math.round(performance.now() - start)
      const withDuration = { ...res, executionTimeMs: durationMs }
      setStepResults((prev) => ({ ...prev, proposal: withDuration }))
      setResult('proposeNode', withDuration)
      addEntry({
        type: 'proposal',
        toolName: 'propose_node',
        status: res.decision.toLowerCase(),
        detail: `Demo: "${title}" → ${res.decision}`,
        durationMs,
        runId: res.runId ?? undefined,
      })
      goToNext()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setErrors((prev) => ({ ...prev, demo_propose: msg }))
      addEntry({
        type: 'proposal',
        toolName: 'propose_node',
        status: 'error',
        detail: `Demo: ${msg}`,
        durationMs: Math.round(performance.now() - start),
      })
    } finally {
      setLoading((prev) => ({ ...prev, demo_propose: false }))
    }
  }, [
    client,
    workspaceId,
    stepResults.context,
    setLoading,
    setErrors,
    setResult,
    addEntry,
    goToNext,
  ])

  // ── Render Helpers ──────────────────────────────────────────────────────

  const renderContextSummary = () => {
    const ctx = stepResults.context
    if (!ctx) return null
    return (
      <div className="space-y-2 rounded-lg border bg-emerald-50 p-3 text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span className="font-medium text-emerald-700">Context Resolved Successfully</span>
          <Badge variant="outline" className="text-[10px]">
            {ctx.executionTimeMs}ms
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <span className="text-muted-foreground">Items: </span>
            <span className="font-mono font-semibold">{ctx.contextItems.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Tokens: </span>
            <span className="font-mono">{ctx.summary.totalTokens}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Run: </span>
            <span className="font-mono">{ctx.pipelineRunId.slice(0, 8)}…</span>
          </div>
        </div>
        {ctx.contextItems.length > 0 && (
          <div className="mt-1 rounded border bg-white p-2">
            <div className="font-medium text-emerald-800">{ctx.contextItems[0].title}</div>
            <div className="mt-0.5 text-emerald-600">
              type={ctx.contextItems[0].type} · d={ctx.contextItems[0].distance} · score=
              {ctx.contextItems[0].score ?? '—'}
            </div>
            <div className="mt-1 line-clamp-2 text-emerald-600">{ctx.contextItems[0].content}</div>
          </div>
        )}
      </div>
    )
  }

  const renderDecisionSummary = () => {
    const dec = stepResults.decision
    if (!dec) return null
    const color = dec.decision === 'ALLOW' ? 'emerald' : dec.decision === 'DENY' ? 'red' : 'amber'
    return (
      <div className={`space-y-2 rounded-lg border bg-${color}-50 p-3 text-xs`}>
        <div className="flex items-center gap-2">
          {dec.decision === 'ALLOW' ? (
            <CheckCircle className={`h-4 w-4 text-${color}-600`} />
          ) : (
            <ShieldAlert className={`h-4 w-4 text-${color}-600`} />
          )}
          <span className={`font-medium text-${color}-700`}>{dec.decision}</span>
          <Badge variant="outline" className="text-[10px]">
            {dec.riskLevel} RISK
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {dec.executionTimeMs}ms
          </Badge>
        </div>
        <p className={`text-${color}-600`}>{dec.explanation}</p>
        <div className="flex flex-wrap gap-1">
          {dec.trace.map((step, i) => (
            <div key={`${step.guardrail}-${i}`} className="flex items-center gap-1 text-[10px]">
              {step.passed ? (
                <CheckCircle className="h-3 w-3 text-emerald-500" />
              ) : (
                <span className="text-red-500">✕</span>
              )}
              <span className={step.passed ? 'text-emerald-700' : 'text-red-700'}>
                {step.guardrail}
              </span>
            </div>
          ))}
        </div>
        {dec.approvalRequired && (
          <div className="rounded border border-amber-200 bg-amber-100 p-2 text-amber-700">
            ⚠️ Approval required: {dec.approvalReason ?? 'Human approval needed'}
          </div>
        )}
      </div>
    )
  }

  const renderProposalSummary = () => {
    const prop = stepResults.proposal
    if (!prop) return null
    const isPublished = prop.decision === 'PUBLISHED'
    return (
      <div
        className={`space-y-2 rounded-lg border ${isPublished ? 'bg-emerald-50' : 'bg-amber-50'} p-3 text-xs`}
      >
        <div className="flex items-center gap-2">
          {isPublished ? (
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          ) : (
            <FileText className="h-4 w-4 text-amber-600" />
          )}
          <span className={`font-medium ${isPublished ? 'text-emerald-700' : 'text-amber-700'}`}>
            {prop.decision}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {prop.executionTimeMs}ms
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[11px]">
          <div>
            <span className="text-muted-foreground">Proposal: </span>
            <span className="font-mono">{prop.proposalId.slice(0, 12)}…</span>
          </div>
          {prop.nodeId && (
            <div>
              <span className="text-muted-foreground">Node: </span>
              <span className="font-mono">{prop.nodeId.slice(0, 12)}…</span>
            </div>
          )}
          {prop.runId && (
            <div>
              <span className="text-muted-foreground">Run: </span>
              <span className="font-mono">{prop.runId.slice(0, 8)}…</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {prop.validationTrace.map((step, i) => (
            <div key={`${step.step}-${i}`} className="flex items-center gap-1 text-[10px]">
              {step.passed ? (
                <CheckCircle className="h-3 w-3 text-emerald-500" />
              ) : (
                <span className="text-red-500">✕</span>
              )}
              <span className={step.passed ? 'text-emerald-700' : 'text-red-700'}>{step.step}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Main Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Rocket className="text-primary h-4 w-4" />
        <h3 className="text-sm font-semibold">Demo Walkthrough</h3>
        <Badge variant="outline" className="text-[10px]">
          Interactive Tutorial
        </Badge>
      </div>
      <p className="text-muted-foreground text-xs">
        Walk through the complete ContextGraph agent flow — from context retrieval through action
        authorization to governed knowledge proposal — using real backend calls.
      </p>

      {/* Progress Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto py-1">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const isActive = step.id === currentStep
          const isComplete = i < stepIndex
          return (
            <div key={step.id} className="flex shrink-0 items-center">
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isComplete
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {isComplete ? <CheckCircle className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="text-muted-foreground mx-0.5 h-3 w-3 shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* Current Step Content */}
      <Card>
        <CardContent className="p-4">
          {currentStep === 'intro' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Rocket className="text-primary h-5 w-5" />
                <h4 className="text-sm font-semibold">Demo Scenario: Post-Incident Knowledge</h4>
              </div>
              <div className="text-muted-foreground space-y-3 text-xs leading-relaxed">
                <p>
                  In this walkthrough, you&apos;ll act as an AI agent interacting with ContextGraph
                  to discover, validate, and contribute organizational knowledge.
                </p>
                <div className="bg-muted/30 rounded-md border p-3">
                  <p className="text-foreground mb-2 font-medium">The Flow:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-[9px]">
                        1
                      </Badge>
                      <Search className="h-3 w-3 text-blue-500" />
                      <span>
                        <strong>resolve_context</strong> — Find existing deployment guidance
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-[9px]">
                        2
                      </Badge>
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      <span>
                        <strong>Inspect</strong> — Review the context package returned
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-[9px]">
                        3
                      </Badge>
                      <ShieldAlert className="h-3 w-3 text-amber-500" />
                      <span>
                        <strong>check_action</strong> — Can I publish new knowledge?
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-[9px]">
                        4
                      </Badge>
                      <ShieldAlert className="h-3 w-3 text-amber-500" />
                      <span>
                        <strong>Inspect</strong> — Review the guardrail trace
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-[9px]">
                        5
                      </Badge>
                      <FileText className="h-3 w-3 text-blue-500" />
                      <span>
                        <strong>propose_node</strong> — Submit knowledge for governance
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-[9px]">
                        6
                      </Badge>
                      <Zap className="h-3 w-3 text-violet-500" />
                      <span>
                        <strong>Observe</strong> — Watch for NODE_PUBLISHED event below
                      </span>
                    </div>
                  </div>
                </div>
                <p>
                  Every tool call goes through the real ContextGraph backend — authorization, graph
                  traversal, rules, and policy enforcement are all active. No data is mocked.
                </p>
              </div>
              <Button onClick={goToNext} size="sm" className="gap-2">
                Start Walkthrough <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {currentStep === 'resolve' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-500" />
                <div>
                  <h4 className="text-sm font-semibold">Step 1: Resolve Context</h4>
                  <p className="text-muted-foreground text-xs">
                    Ask ContextGraph for governed knowledge about post-incident deployment guidance.
                  </p>
                </div>
              </div>
              <div className="bg-muted/30 rounded-md border p-3 text-xs">
                <p className="mb-1 font-medium">Query:</p>
                <p className="text-muted-foreground italic">
                  &quot;post-incident deployment guidance and service restart procedures&quot;
                </p>
                <p className="text-muted-foreground mt-2">
                  This calls the Context Pipeline which performs: Authorization → Graph Traversal →
                  Rule Engine → Candidate Building → Ranking → Budget.
                </p>
              </div>
              <Button
                onClick={() => void runResolveContext()}
                disabled={client === null || (loading.demo_resolve ?? false)}
                size="sm"
                className="gap-2"
              >
                {(loading.demo_resolve ?? false) ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {(loading.demo_resolve ?? false) ? 'Resolving...' : 'Run resolve_context'}
              </Button>
              {errors.demo_resolve && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {errors.demo_resolve}
                </div>
              )}
            </div>
          )}

          {currentStep === 'inspect_context' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <div>
                  <h4 className="text-sm font-semibold">Step 2: Inspect Context Results</h4>
                  <p className="text-muted-foreground text-xs">
                    Review what ContextGraph returned — only authorized knowledge items.
                  </p>
                </div>
              </div>
              {renderContextSummary()}
              <div className="rounded-md border p-3 text-xs">
                <p className="mb-1 font-medium">Key observations:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>
                    • ContextGraph applied permission filtering — you only see authorized nodes
                  </li>
                  <li>• Each item has provenance: distance, rank, inclusion reason</li>
                  <li>• A pipeline run was created for full audit trail</li>
                  <li>• The funnel shows how many nodes were filtered at each stage</li>
                </ul>
              </div>
              <Button onClick={goToNext} size="sm" className="gap-2">
                Continue to Action Check <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {currentStep === 'check_action' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                <div>
                  <h4 className="text-sm font-semibold">Step 3: Check Action</h4>
                  <p className="text-muted-foreground text-xs">
                    Ask ContextGraph: &quot;Am I allowed to publish knowledge?&quot;
                  </p>
                </div>
              </div>
              <div className="bg-muted/30 rounded-md border p-3 text-xs">
                <p className="mb-1 font-medium">Action:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">action: </span>
                    <span className="font-mono">PUBLISH_KNOWLEDGE</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">targetType: </span>
                    <span className="font-mono">KNOWLEDGE_NODE</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">purpose: </span>Publish deployment
                    guidance discovered through context resolution
                  </div>
                </div>
                <p className="text-muted-foreground mt-2">
                  This calls the Action Guardrail Engine which evaluates 14+ deterministic
                  guardrails without executing any action.
                </p>
              </div>
              <Button
                onClick={() => void runCheckAction()}
                disabled={client === null || (loading.demo_check ?? false)}
                size="sm"
                className="gap-2"
              >
                {(loading.demo_check ?? false) ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {(loading.demo_check ?? false) ? 'Evaluating...' : 'Run check_action'}
              </Button>
              {errors.demo_check && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {errors.demo_check}
                </div>
              )}
            </div>
          )}

          {currentStep === 'inspect_decision' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                <div>
                  <h4 className="text-sm font-semibold">Step 4: Inspect Decision</h4>
                  <p className="text-muted-foreground text-xs">
                    Review the guardrail trace — which checks passed, which failed, and why.
                  </p>
                </div>
              </div>
              {renderDecisionSummary()}
              <div className="rounded-md border p-3 text-xs">
                <p className="mb-1 font-medium">Key observations:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Authentication and capability checks pass first (fail-closed)</li>
                  <li>• Organization isolation prevents cross-tenant actions</li>
                  <li>
                    • Policy evaluation is deterministic — same input always produces same output
                  </li>
                  <li>• If REQUIRES_APPROVAL: the action is NOT blocked, but needs human review</li>
                  <li>• check_action NEVER executes the action — it only evaluates permission</li>
                </ul>
              </div>
              <Button onClick={goToNext} size="sm" className="gap-2">
                Continue to Propose Node <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {currentStep === 'propose' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <h4 className="text-sm font-semibold">Step 5: Propose Knowledge</h4>
                  <p className="text-muted-foreground text-xs">
                    Submit a governed knowledge proposal based on the context you discovered.
                  </p>
                </div>
              </div>
              <div className="bg-muted/30 rounded-md border p-3 text-xs">
                <p className="mb-1 font-medium">Proposal:</p>
                <div className="space-y-1">
                  <div>
                    <span className="text-muted-foreground">nodeType: </span>
                    <span className="font-mono">FACT</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">title: </span>
                    <span className="font-mono">
                      {stepResults.context?.contextItems[0]
                        ? `Post-Incident: ${stepResults.context.contextItems[0].title.slice(0, 60)}…`
                        : 'Post-Incident Deployment Procedure'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">classification: </span>
                    <span className="font-mono">INTERNAL</span>
                  </div>
                </div>
                <p className="text-muted-foreground mt-2">
                  The proposal goes through: Identity → Authorization → Schema Validation → Content
                  Hash → Duplicate Check → Graph Validation → Policy Check → Decision.
                </p>
              </div>
              <Button
                onClick={() => void runProposeNode()}
                disabled={client === null || (loading.demo_propose ?? false)}
                size="sm"
                className="gap-2"
              >
                {(loading.demo_propose ?? false) ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {(loading.demo_propose ?? false) ? 'Proposing...' : 'Run propose_node'}
              </Button>
              {errors.demo_propose && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {errors.demo_propose}
                </div>
              )}
            </div>
          )}

          {currentStep === 'inspect_proposal' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <h4 className="text-sm font-semibold">Step 6: Inspect Proposal</h4>
                  <p className="text-muted-foreground text-xs">
                    Review the proposal validation trace and final decision.
                  </p>
                </div>
              </div>
              {renderProposalSummary()}
              <div className="rounded-md border p-3 text-xs">
                <p className="mb-1 font-medium">Key observations:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>
                    • 11-step validation ensures only valid, authorized knowledge is persisted
                  </li>
                  <li>
                    • Content hash enables deduplication — the same proposal won&apos;t create
                    duplicates
                  </li>
                  <li>• If PENDING_APPROVAL: the node exists but is NOT active knowledge yet</li>
                  <li>
                    • If PUBLISHED: the node is now organizational knowledge available to all
                    authorized agents
                  </li>
                  <li>
                    • Provenance is preserved — everyone can trace where this knowledge came from
                  </li>
                </ul>
              </div>
              <Button onClick={goToNext} size="sm" className="gap-2">
                Continue to Event Observation <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {currentStep === 'observe_event' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-violet-500" />
                <div>
                  <h4 className="text-sm font-semibold">Step 7: Observe Events</h4>
                  <p className="text-muted-foreground text-xs">
                    Watch for real-time events in the Live Event Stream below this panel.
                  </p>
                </div>
              </div>
              <div className="rounded-md border border-violet-200 bg-violet-50 p-4 text-xs">
                <div className="mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-violet-600" />
                  <span className="font-medium text-violet-700">Live Event Stream</span>
                </div>
                <p className="mb-3 text-violet-600">
                  If the proposal was PUBLISHED, you should see a <strong>NODE_PUBLISHED</strong>{' '}
                  event appear in the Live Event Stream at the bottom of the playground. Other
                  events you may see:
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-violet-100 text-[9px] text-violet-700">
                      MCP_TOOL_CALLED
                    </Badge>
                    <span className="text-violet-600">Each tool invocation is tracked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-[9px] text-blue-700">
                      NODE_PROPOSED
                    </Badge>
                    <span className="text-violet-600">Created when the proposal is submitted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-100 text-[9px] text-emerald-700">
                      NODE_PUBLISHED
                    </Badge>
                    <span className="text-violet-600">
                      When the proposal becomes active knowledge
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-100 text-[9px] text-emerald-700">
                      INDEXING_COMPLETED
                    </Badge>
                    <span className="text-violet-600">
                      When the node becomes searchable via semantic search
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-md border p-3 text-xs">
                <p className="mb-1 font-medium">The Blackboard Model:</p>
                <p className="text-muted-foreground">
                  Now that this knowledge is published, Agent B can discover it through
                  <strong> resolve_context</strong> — but only if Agent B is authorized. The event
                  itself does NOT grant access. Permission filtering still applies.
                </p>
              </div>
              <Button onClick={goToNext} size="sm" className="gap-2">
                Complete Walkthrough <CheckCircle className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <div>
                  <h4 className="text-sm font-semibold">Demo Complete!</h4>
                  <p className="text-muted-foreground text-xs">
                    You&apos;ve walked through the complete ContextGraph agent flow.
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs">
                <p className="mb-3 font-medium text-emerald-700">What you just demonstrated:</p>
                <div className="space-y-2 text-emerald-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <strong>Governed Context Retrieval</strong> — Permission-filtered,
                      rule-evaluated, ranked context
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <strong>Deterministic Action Guardrails</strong> — 14+ guardrails evaluated
                      without executing any action
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <strong>Governed Write-Back</strong> — Agent proposes, ContextGraph decides,
                      with full validation trace
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <strong>Real-Time Events</strong> — Observable state changes via SSE with
                      tenant isolation
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <strong>Full Audit Trail</strong> — Every operation recorded with correlation
                      IDs for replay
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-md border p-3 text-xs">
                <p className="mb-1 font-medium">Next steps:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Try the other tool tabs to experiment with different inputs</li>
                  <li>• Check the Activity Feed and Execution Timeline on the right</li>
                  <li>• Watch the Live Event Stream for real-time context graph events</li>
                  <li>• Switch users via the Demo User Switcher to see permission differences</li>
                  <li>• Use the Connect Agent tab to connect a real MCP client</li>
                </ul>
              </div>
              <Button onClick={restart} variant="outline" size="sm" className="gap-2">
                <RotateCcw className="h-3.5 w-3.5" />
                Restart Walkthrough
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {currentStep !== 'intro' && currentStep !== 'complete' && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goToPrev} disabled={stepIndex === 0}>
            ← Previous
          </Button>
          <span className="text-muted-foreground text-[10px]">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
        </div>
      )}
    </div>
  )
}
