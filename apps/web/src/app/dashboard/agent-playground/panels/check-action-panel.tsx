'use client'

import { useCallback, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ShieldAlert,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { ToolExec, ActivityEntry } from '@/hooks/use-playground'

interface Props {
  toolExec: ToolExec
  addEntry: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
}

const DECISION_ICON: Record<string, React.ElementType> = {
  ALLOW: CheckCircle,
  DENY: XCircle,
  REQUIRES_APPROVAL: AlertTriangle,
  ERROR: XCircle,
}

const DECISION_COLOR: Record<string, string> = {
  ALLOW: 'text-emerald-600',
  DENY: 'text-red-600',
  REQUIRES_APPROVAL: 'text-amber-600',
  ERROR: 'text-red-600',
}

const RISK_BADGE: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

const ACTIONS = [
  'UPDATE_KNOWLEDGE',
  'CREATE_KNOWLEDGE',
  'DELETE_KNOWLEDGE',
  'PUBLISH_KNOWLEDGE',
  'SEND_EXTERNAL_MESSAGE',
  'APPROVE_OPERATION',
  'EXECUTE_WORKFLOW',
]

const TARGET_TYPES = ['KNOWLEDGE_NODE', 'DOCUMENT', 'CUSTOMER', 'WORKFLOW', 'ORGANIZATION']

export function CheckActionPanel({ toolExec, addEntry }: Props) {
  const { client, loading, setLoading, errors, setErrors, results, setResult } = toolExec
  const [action, setAction] = useState('')
  const [targetType, setTargetType] = useState('')
  const [targetId, setTargetId] = useState('')
  const [purpose, setPurpose] = useState('')
  const [copied, setCopied] = useState(false)
  const [traceExpanded, setTraceExpanded] = useState(true)

  const isLoading = loading.checkAction ?? false
  const result = results.checkAction

  const handleRun = useCallback(async () => {
    if (client === null || !action || !targetType) return
    setLoading((prev) => ({ ...prev, checkAction: true }))
    setErrors((prev) => ({ ...prev, checkAction: null }))

    const start = performance.now()
    try {
      const res = await client.playgroundCheckAction({
        action,
        targetType,
        targetId: targetId.trim() || undefined,
        purpose: purpose.trim() || undefined,
      })
      const durationMs = Math.round(performance.now() - start)
      const withDuration = { ...res, executionTimeMs: durationMs }
      setResult('checkAction', withDuration)
      addEntry({
        type: 'action_check',
        toolName: 'check_action',
        status: res.decision.toLowerCase(),
        detail: `${action} → ${res.decision} (${res.riskLevel})`,
        durationMs,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setErrors((prev) => ({ ...prev, checkAction: msg }))
      addEntry({
        type: 'action_check',
        toolName: 'check_action',
        status: 'error',
        detail: msg,
        durationMs: Math.round(performance.now() - start),
      })
    } finally {
      setLoading((prev) => ({ ...prev, checkAction: false }))
    }
  }, [client, action, targetType, targetId, purpose, setLoading, setErrors, setResult, addEntry])

  const handleCopy = useCallback(() => {
    if (result === null) return
    const safe = {
      decision: result.decision,
      action: result.action,
      targetType: result.targetType,
      targetId: result.targetId,
      riskLevel: result.riskLevel,
      reasonCode: result.reasonCode,
      explanation: result.explanation,
      approvalRequired: result.approvalRequired,
      trace: result.trace,
    }
    void navigator.clipboard.writeText(JSON.stringify(safe, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  return (
    <div className="space-y-4">
      {/* Tool Header */}
      <div className="flex items-center gap-2">
        <ShieldAlert className="text-primary h-4 w-4" />
        <h3 className="text-sm font-semibold">check_action</h3>
        <Badge variant="outline" className="text-[10px]">
          context.resolve
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          read-only
        </Badge>
      </div>
      <p className="text-muted-foreground text-xs">
        Evaluate whether the authenticated agent is permitted to perform a requested action. Returns
        ALLOW, DENY, or REQUIRES_APPROVAL with a full guardrail trace.
      </p>

      {/* Input Form */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium">Action *</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Select action...</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Target Type *</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Select type...</option>
            {TARGET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Target ID</label>
          <input
            type="text"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="UUID (optional)"
            className="bg-background w-full rounded-md border px-3 py-2 font-mono text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Purpose</label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Brief description of intent"
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <Button
        onClick={() => void handleRun()}
        disabled={!action || !targetType || client === null || isLoading}
        className="gap-2"
        size="sm"
      >
        {isLoading ? <span className="animate-spin">⏳</span> : <Play className="h-3.5 w-3.5" />}
        {isLoading ? 'Evaluating...' : 'Run check_action'}
      </Button>

      {/* Error */}
      {errors.checkAction && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {errors.checkAction}
        </div>
      )}

      {/* Result */}
      {result !== null && (
        <div className="space-y-3">
          {/* Decision Banner */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            {(() => {
              const DecIcon = DECISION_ICON[result.decision] ?? AlertTriangle
              return <DecIcon className={`h-6 w-6 ${DECISION_COLOR[result.decision]}`} />
            })()}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${DECISION_COLOR[result.decision]}`}>
                  {result.decision}
                </span>
                <Badge variant="outline" className={RISK_BADGE[result.riskLevel] ?? ''}>
                  {result.riskLevel} RISK
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">{result.explanation}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                {result.executionTimeMs}ms
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-[10px]"
                onClick={handleCopy}
              >
                {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Violated Policies */}
          {result.violatedPolicies.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <div className="mb-1 text-xs font-medium text-red-700">Violated Policies</div>
              <div className="flex flex-wrap gap-1">
                {result.violatedPolicies.map((p) => (
                  <Badge key={p} variant="destructive" className="text-[10px]">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Approval Required */}
          {result.approvalRequired && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="mb-1 text-xs font-medium text-amber-700">Approval Required</div>
              <p className="text-xs text-amber-600">
                {result.approvalReason ?? 'Human approval is required to proceed.'}
              </p>
            </div>
          )}

          {/* Guardrail Trace */}
          <div className="rounded-md border">
            <button
              onClick={() => setTraceExpanded((v) => !v)}
              className="flex w-full items-center gap-2 p-2.5 text-left"
            >
              {traceExpanded ? (
                <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
              )}
              <span className="text-xs font-medium">Guardrail Trace</span>
              <Badge variant="outline" className="text-[10px]">
                {result.trace.length} steps
              </Badge>
            </button>
            {traceExpanded && (
              <div className="border-t p-3">
                <div className="space-y-1">
                  {result.trace.map((step, i) => (
                    <div key={`${step.guardrail}-${i}`} className="flex items-center gap-2 text-xs">
                      {step.passed ? (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className="w-36 font-medium">{step.guardrail}</span>
                      <span className="text-muted-foreground flex-1">{step.reason}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          step.severity === 'CRITICAL'
                            ? 'border-red-200 text-red-600'
                            : step.severity === 'HIGH'
                              ? 'border-orange-200 text-orange-600'
                              : ''
                        }`}
                      >
                        {step.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
