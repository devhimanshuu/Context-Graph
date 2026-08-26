'use client'

import { useCallback, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  Play,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle,
  Package,
  Boxes,
} from 'lucide-react'
import type { ToolExec, ActivityEntry } from '@/hooks/use-playground'

interface Props {
  workspaceId: string
  toolExec: ToolExec
  addEntry: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
}

export function ResolveContextPanel({ workspaceId, toolExec, addEntry }: Props) {
  const { client, loading, setLoading, errors, setErrors, results, setResult } = toolExec
  const [query, setQuery] = useState('')
  const [entryNodeId, setEntryNodeId] = useState('')
  const [topK, setTopK] = useState('10')
  const [tokenBudget, setTokenBudget] = useState('4096')
  const [retrievalMode, setRetrievalMode] = useState('bfs')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isLoading = loading.resolveContext ?? false
  const result = results.resolveContext

  const handleRun = useCallback(async () => {
    if (client === null || !query.trim()) return
    setLoading((prev) => ({ ...prev, resolveContext: true }))
    setErrors((prev) => ({ ...prev, resolveContext: null }))

    const start = performance.now()
    try {
      const res = await client.playgroundResolveContext({
        query: query.trim(),
        workspaceId,
        entryNodeId: entryNodeId.trim() || undefined,
        topK: parseInt(topK) || 10,
        tokenBudget: parseInt(tokenBudget) || 4096,
        retrievalMode,
        executionMode: 'STANDARD',
      })
      const durationMs = Math.round(performance.now() - start)
      const withDuration = { ...res, executionTimeMs: durationMs }
      setResult('resolveContext', withDuration)
      addEntry({
        type: 'tool_call',
        toolName: 'resolve_context',
        status: 'success',
        detail: `${res.contextItems.length} items · ${res.summary.totalTokens} tokens`,
        durationMs,
        runId: res.pipelineRunId,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setErrors((prev) => ({ ...prev, resolveContext: msg }))
      addEntry({
        type: 'tool_call',
        toolName: 'resolve_context',
        status: 'error',
        detail: msg,
        durationMs: Math.round(performance.now() - start),
      })
    } finally {
      setLoading((prev) => ({ ...prev, resolveContext: false }))
    }
  }, [
    client,
    query,
    workspaceId,
    entryNodeId,
    topK,
    tokenBudget,
    retrievalMode,
    setLoading,
    setErrors,
    setResult,
    addEntry,
  ])

  const handleCopy = useCallback(() => {
    if (result === null) return
    const safe = {
      packageId: result.packageId,
      requestId: result.requestId,
      contextItems: result.contextItems.map((item) => ({
        nodeId: item.nodeId,
        title: item.title,
        type: item.type,
        distance: item.distance,
        importance: item.importance,
        inclusionReason: item.inclusionReason,
        content: item.content,
      })),
      summary: result.summary,
      funnel: result.funnel,
    }
    void navigator.clipboard.writeText(JSON.stringify(safe, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  return (
    <div className="space-y-4">
      {/* Tool Header */}
      <div className="flex items-center gap-2">
        <Search className="text-primary h-4 w-4" />
        <h3 className="text-sm font-semibold">resolve_context</h3>
        <Badge variant="outline" className="text-[10px]">
          context.resolve
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          read-only
        </Badge>
      </div>
      <p className="text-muted-foreground text-xs">
        Retrieve organization knowledge that the current principal is authorized to use. Context is
        filtered by permission and deterministic policy engine.
      </p>

      {/* Input Form */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium">Query *</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. What is the post-incident deployment guidance?"
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            rows={2}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Entry Node ID</label>
          <input
            type="text"
            value={entryNodeId}
            onChange={(e) => setEntryNodeId(e.target.value)}
            placeholder="UUID (optional — defaults to workspace)"
            className="bg-background w-full rounded-md border px-3 py-2 font-mono text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium">Top K</label>
            <input
              type="number"
              value={topK}
              onChange={(e) => setTopK(e.target.value)}
              min={1}
              max={100}
              className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Token Budget</label>
            <input
              type="number"
              value={tokenBudget}
              onChange={(e) => setTokenBudget(e.target.value)}
              min={256}
              max={100000}
              className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Mode</label>
            <select
              value={retrievalMode}
              onChange={(e) => setRetrievalMode(e.target.value)}
              className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="bfs">BFS</option>
              <option value="weighted">Weighted</option>
            </select>
          </div>
        </div>
      </div>

      <Button
        onClick={() => void handleRun()}
        disabled={!query.trim() || client === null || isLoading}
        className="gap-2"
        size="sm"
      >
        {isLoading ? <span className="animate-spin">⏳</span> : <Play className="h-3.5 w-3.5" />}
        {isLoading ? 'Resolving...' : 'Run resolve_context'}
      </Button>

      {/* Error */}
      {errors.resolveContext && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {errors.resolveContext}
        </div>
      )}

      {/* Result */}
      {result !== null && (
        <div className="space-y-3">
          {/* Summary Bar */}
          <div className="bg-muted/30 flex flex-wrap items-center gap-2 rounded-lg border p-3">
            <div className="flex items-center gap-1 text-xs">
              <Package className="text-muted-foreground h-3.5 w-3.5" />
              <span className="font-mono font-semibold">{result.contextItems.length}</span>
              <span className="text-muted-foreground">items</span>
            </div>
            <div className="bg-border h-3 w-px" />
            <div className="flex items-center gap-1 text-xs">
              <Boxes className="text-muted-foreground h-3.5 w-3.5" />
              <span className="font-mono">{result.funnel.reachable}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-mono">{result.funnel.authorized}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-mono font-semibold">{result.funnel.included}</span>
            </div>
            <div className="bg-border h-3 w-px" />
            <Badge variant="outline" className="font-mono text-[10px]">
              {result.executionTimeMs}ms
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              {result.summary.totalTokens} tokens
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              run: {result.pipelineRunId.slice(0, 8)}…
            </Badge>
            {result.summary.truncated && (
              <Badge variant="destructive" className="text-[10px]">
                truncated
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 gap-1 text-[10px]"
              onClick={handleCopy}
            >
              {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* Context Items */}
          <div className="space-y-1.5">
            {result.contextItems.map((item, i) => {
              const isExpanded = expandedItem === item.nodeId
              return (
                <div
                  key={item.nodeId}
                  className="hover:bg-muted/30 rounded-md border transition-colors"
                >
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.nodeId)}
                    className="flex w-full items-center gap-2 p-2.5 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="text-muted-foreground h-3 w-3 shrink-0" />
                    ) : (
                      <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0" />
                    )}
                    <span className="text-muted-foreground font-mono text-[10px]">
                      #{item.rank ?? i + 1}
                    </span>
                    <Badge variant="outline" className="shrink-0 text-[9px]">
                      {item.type}
                    </Badge>
                    <span className="truncate text-xs font-medium">{item.title}</span>
                    <div className="ml-auto flex shrink-0 items-center gap-1.5">
                      <Badge variant="secondary" className="text-[9px]">
                        d={item.distance}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px]">
                        s={item.score?.toFixed(2) ?? '—'}
                      </Badge>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t px-3 py-2.5">
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-muted-foreground font-medium">Reason: </span>
                          <span>{item.inclusionReason}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-medium">Content: </span>
                          <span className="text-muted-foreground line-clamp-4 font-mono text-[11px] whitespace-pre-wrap">
                            {item.content}
                          </span>
                        </div>
                        {item.complianceTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.complianceTags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[9px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="text-muted-foreground font-mono text-[10px]">
                          nodeId: {item.nodeId}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
