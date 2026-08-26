'use client'

import { useCallback, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { ToolExec, ActivityEntry } from '@/hooks/use-playground'

interface Props {
  workspaceId: string
  toolExec: ToolExec
  addEntry: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
}

const DECISION_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  PUBLISHED: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  PENDING_APPROVAL: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  REJECTED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  DUPLICATE: { icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  FAILED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
}

export function ProposeNodePanel({ workspaceId, toolExec, addEntry }: Props) {
  const { client, loading, setLoading, errors, setErrors, results, setResult } = toolExec
  const [nodeType, setNodeType] = useState<'FACT' | 'DECISION'>('FACT')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [classification, setClassification] = useState('INTERNAL')
  const [purpose, setPurpose] = useState('')
  const [copied, setCopied] = useState(false)
  const [traceExpanded, setTraceExpanded] = useState(true)

  const isLoading = loading.proposeNode ?? false
  const result = results.proposeNode

  const handleRun = useCallback(async () => {
    if (client === null || !title.trim() || !content.trim()) return
    setLoading((prev) => ({ ...prev, proposeNode: true }))
    setErrors((prev) => ({ ...prev, proposeNode: null }))

    const start = performance.now()
    try {
      const res = await client.playgroundProposeNode({
        nodeType,
        title: title.trim(),
        content: content.trim(),
        classification,
        workspaceId,
        purpose: purpose.trim() || undefined,
        idempotencyKey: `playground_${Date.now()}`,
      })
      const durationMs = Math.round(performance.now() - start)
      const withDuration = { ...res, executionTimeMs: durationMs }
      setResult('proposeNode', withDuration)
      addEntry({
        type: 'proposal',
        toolName: 'propose_node',
        status: res.decision.toLowerCase(),
        detail: `${nodeType} "${title.trim()}" → ${res.decision}`,
        durationMs,
        runId: res.runId ?? undefined,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setErrors((prev) => ({ ...prev, proposeNode: msg }))
      addEntry({
        type: 'proposal',
        toolName: 'propose_node',
        status: 'error',
        detail: msg,
        durationMs: Math.round(performance.now() - start),
      })
    } finally {
      setLoading((prev) => ({ ...prev, proposeNode: false }))
    }
  }, [
    client,
    nodeType,
    title,
    content,
    classification,
    workspaceId,
    purpose,
    setLoading,
    setErrors,
    setResult,
    addEntry,
  ])

  const handleCopy = useCallback(() => {
    if (result === null) return
    void navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  return (
    <div className="space-y-4">
      {/* Tool Header */}
      <div className="flex items-center gap-2">
        <FileText className="text-primary h-4 w-4" />
        <h3 className="text-sm font-semibold">propose_node</h3>
        <Badge variant="outline" className="text-[10px]">
          knowledge.write
        </Badge>
      </div>
      <p className="text-muted-foreground text-xs">
        Propose a new governed knowledge node. The proposal is validated against permissions,
        policies, and graph rules before it can become active knowledge.
      </p>

      {/* Input Form */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium">Node Type *</label>
          <select
            value={nodeType}
            onChange={(e) => setNodeType(e.target.value as 'FACT' | 'DECISION')}
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="FACT">FACT</option>
            <option value="DECISION">DECISION</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Classification *</label>
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="PUBLIC">PUBLIC</option>
            <option value="INTERNAL">INTERNAL</option>
            <option value="CONFIDENTIAL">CONFIDENTIAL</option>
            <option value="RESTRICTED">RESTRICTED</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short descriptive title"
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium">Content *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Full knowledge content body..."
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            rows={4}
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium">Purpose</label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Why this knowledge is being proposed"
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <Button
        onClick={() => void handleRun()}
        disabled={!title.trim() || !content.trim() || client === null || isLoading}
        className="gap-2"
        size="sm"
      >
        {isLoading ? <span className="animate-spin">⏳</span> : <Play className="h-3.5 w-3.5" />}
        {isLoading ? 'Proposing...' : 'Run propose_node'}
      </Button>

      {/* Error */}
      {errors.proposeNode && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {errors.proposeNode}
        </div>
      )}

      {/* Result */}
      {result !== null && (
        <div className="space-y-3">
          {/* Decision Banner */}
          {(() => {
            const cfg = DECISION_CONFIG[result.decision] ?? DECISION_CONFIG.FAILED
            const Icon = cfg.icon
            return (
              <div className={`flex items-center gap-3 rounded-lg border p-3 ${cfg.bg}`}>
                <Icon className={`h-6 w-6 ${cfg.color}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${cfg.color}`}>{result.decision}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {result.status}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    Proposal: {result.proposalId.slice(0, 12)}…
                    {result.nodeId && ` · Node: ${result.nodeId.slice(0, 12)}…`}
                    {result.runId && ` · Run: ${result.runId.slice(0, 8)}…`}
                  </div>
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
            )
          })()}

          {/* Approval Required Notice */}
          {result.approvalRequired && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="mb-1 text-xs font-medium text-amber-700">Approval Required</div>
              <p className="text-xs text-amber-600">
                This proposal requires human approval before it can be published as active
                knowledge.
              </p>
            </div>
          )}

          {/* Validation Trace */}
          {result.validationTrace.length > 0 && (
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
                <span className="text-xs font-medium">Validation Trace</span>
                <Badge variant="outline" className="text-[10px]">
                  {result.validationTrace.length} steps
                </Badge>
              </button>
              {traceExpanded && (
                <div className="border-t p-3">
                  <div className="space-y-1">
                    {result.validationTrace.map((step, i) => (
                      <div key={`${step.step}-${i}`} className="flex items-center gap-2 text-xs">
                        {step.passed ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <span className="w-36 font-medium">{step.step}</span>
                        <span className="text-muted-foreground flex-1">
                          {step.message ?? (step.passed ? 'Passed' : 'Failed')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
