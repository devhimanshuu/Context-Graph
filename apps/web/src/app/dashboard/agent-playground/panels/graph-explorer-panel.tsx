'use client'

import { useCallback, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GitBranch, Play, Copy, CheckCircle } from 'lucide-react'
import type { ToolExec, ActivityEntry } from '@/hooks/use-playground'

interface Props {
  workspaceId: string
  toolExec: ToolExec
  addEntry: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
}

export function GraphExplorerPanel({ workspaceId, toolExec, addEntry }: Props) {
  const { client, loading, setLoading, errors, setErrors, results, setResult } = toolExec
  const [nodeId, setNodeId] = useState('')
  const [maxDepth, setMaxDepth] = useState('3')
  const [copied, setCopied] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const isLoading = loading.subgraph ?? false
  const result = results.subgraph

  const handleRun = useCallback(async () => {
    if (client === null || !nodeId.trim()) return
    setLoading((prev) => ({ ...prev, subgraph: true }))
    setErrors((prev) => ({ ...prev, subgraph: null }))

    const start = performance.now()
    try {
      const res = await client.playgroundGetSubgraph({
        nodeId: nodeId.trim(),
        workspaceId,
        maxDepth: parseInt(maxDepth) || 3,
        includeMetadata: true,
      })
      const durationMs = Math.round(performance.now() - start)
      setResult('subgraph', res)
      addEntry({
        type: 'tool_call',
        toolName: 'get_subgraph',
        status: 'success',
        detail: `${res.nodes.length} nodes · ${res.edges.length} edges · ${res.metadata.filteredNodes} filtered`,
        durationMs,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setErrors((prev) => ({ ...prev, subgraph: msg }))
      addEntry({
        type: 'tool_call',
        toolName: 'get_subgraph',
        status: 'error',
        detail: msg,
        durationMs: Math.round(performance.now() - start),
      })
    } finally {
      setLoading((prev) => ({ ...prev, subgraph: false }))
    }
  }, [client, nodeId, workspaceId, maxDepth, setLoading, setErrors, setResult, addEntry])

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
        <GitBranch className="text-primary h-4 w-4" />
        <h3 className="text-sm font-semibold">get_subgraph</h3>
        <Badge variant="outline" className="text-[10px]">
          graph.read
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          read-only
        </Badge>
      </div>
      <p className="text-muted-foreground text-xs">
        Inspect an authorized portion of the knowledge graph starting from a node. Only nodes and
        edges the current principal can read are returned.
      </p>

      {/* Input Form */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium">Entry Node ID *</label>
          <input
            type="text"
            value={nodeId}
            onChange={(e) => setNodeId(e.target.value)}
            placeholder="UUID of the node to start from"
            className="bg-background w-full rounded-md border px-3 py-2 font-mono text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Max Depth</label>
          <input
            type="number"
            value={maxDepth}
            onChange={(e) => setMaxDepth(e.target.value)}
            min={1}
            max={10}
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <Button
        onClick={() => void handleRun()}
        disabled={!nodeId.trim() || client === null || isLoading}
        className="gap-2"
        size="sm"
      >
        {isLoading ? <span className="animate-spin">⏳</span> : <Play className="h-3.5 w-3.5" />}
        {isLoading ? 'Exploring...' : 'Run get_subgraph'}
      </Button>

      {/* Error */}
      {errors.subgraph && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {errors.subgraph}
        </div>
      )}

      {/* Result */}
      {result !== null && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="bg-muted/30 flex flex-wrap items-center gap-2 rounded-lg border p-3">
            <div className="flex items-center gap-1 text-xs">
              <span className="font-mono font-semibold">{result.nodes.length}</span>
              <span className="text-muted-foreground">nodes</span>
            </div>
            <div className="bg-border h-3 w-px" />
            <div className="flex items-center gap-1 text-xs">
              <span className="font-mono font-semibold">{result.edges.length}</span>
              <span className="text-muted-foreground">edges</span>
            </div>
            <div className="bg-border h-3 w-px" />
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">depth:</span>
              <span className="font-mono">{result.metadata.maxDepth}</span>
            </div>
            <div className="bg-border h-3 w-px" />
            <Badge variant="destructive" className="text-[10px]">
              {result.metadata.filteredNodes} filtered
            </Badge>
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

          {/* Node List */}
          <div className="space-y-1">
            {result.nodes.map((node) => (
              <div
                key={node.id}
                className={`flex items-center gap-2 rounded border p-2 text-xs transition-colors ${
                  selectedNode === node.id ? 'border-primary/30 bg-primary/5' : 'hover:bg-muted/30'
                }`}
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
              >
                <Badge variant="outline" className="shrink-0 text-[9px]">
                  {node.type}
                </Badge>
                <span className="truncate font-medium">{node.title}</span>
                <Badge variant="secondary" className="ml-auto shrink-0 text-[9px]">
                  d={node.distance}
                </Badge>
                <span className="text-muted-foreground font-mono text-[9px]">
                  {node.id.slice(0, 8)}…
                </span>
              </div>
            ))}
          </div>

          {/* Edge List */}
          {result.edges.length > 0 && (
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium">Edges</h4>
              <div className="space-y-0.5">
                {result.edges.slice(0, 20).map((edge, i) => (
                  <div
                    key={`${edge.source}-${edge.target}-${i}`}
                    className="text-muted-foreground flex items-center gap-1.5 font-mono text-[11px]"
                  >
                    <span>{edge.source.slice(0, 8)}…</span>
                    <span className="text-primary">→</span>
                    <span>{edge.target.slice(0, 8)}…</span>
                    <Badge variant="secondary" className="text-[8px]">
                      {edge.relationship}
                    </Badge>
                  </div>
                ))}
                {result.edges.length > 20 && (
                  <div className="text-muted-foreground text-[10px]">
                    +{result.edges.length - 20} more edges
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
