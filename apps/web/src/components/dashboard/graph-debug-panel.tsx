'use client'

import * as React from 'react'
import { Bug, LoaderCircle, Play, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { useApi } from '@/components/dashboard/api-provider'
import type { DebugReachabilityResult, KnowledgeNode } from '@/lib/api/types'

interface GraphDebugPanelProps {
  workspaceId: string
  nodes: KnowledgeNode[]
}

/**
 * Debug-only graph surface (mirrors the API's /debug prefix): runs the BFS
 * engine with FULL graph validation and shows the raw traversal metadata —
 * no cache, no permission filtering. Restricted to the ADMIN role.
 */
export function GraphDebugPanel({ workspaceId, nodes }: GraphDebugPanelProps) {
  const { client, selectedUser } = useApi()
  const [entryNodeId, setEntryNodeId] = React.useState('')
  const [maxDepth, setMaxDepth] = React.useState(3)
  const [result, setResult] = React.useState<DebugReachabilityResult | null>(null)
  const [running, setRunning] = React.useState(false)
  const [runError, setRunError] = React.useState<string | null>(null)

  const isAdmin = selectedUser?.role === 'ADMIN'
  const nodeById = React.useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])

  React.useEffect(() => {
    if (entryNodeId === '' && nodes.length > 0) setEntryNodeId(nodes[0]?.id ?? '')
  }, [nodes, entryNodeId])

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bug className="text-muted-foreground size-4" />
            Graph debug console
          </CardTitle>
          <CardDescription>
            Reserved for the ADMIN role — switch the demo user in the top bar to access the raw
            engine console.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const run = async () => {
    if (client === null || entryNodeId === '') return
    setRunning(true)
    setRunError(null)
    try {
      setResult(await client.debugReachability(workspaceId, { entryNodeId, maxDepth }))
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Debug run failed')
      setResult(null)
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bug className="size-4 text-amber-500" />
            Graph debug console
          </CardTitle>
          <CardDescription>
            Validated BFS (cycles/broken edges surface as errors) with raw traversal metadata —
            bypasses the cache and permission filtering.
          </CardDescription>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px]">
          <ShieldCheck className="size-3" />
          /debug · ADMIN
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Entry node</label>
            <select
              value={entryNodeId}
              onChange={(event) => setEntryNodeId(event.target.value)}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none"
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Max depth</label>
            <select
              value={maxDepth}
              onChange={(event) => setMaxDepth(Number(event.target.value))}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 items-center rounded-lg border px-2.5 text-sm outline-none"
            >
              {[1, 2, 3, 4, 5].map((depth) => (
                <option key={depth} value={depth}>
                  {depth} hop{depth > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => void run()} disabled={running || entryNodeId === ''}>
            {running ? <LoaderCircle className="animate-spin" /> : <Play className="size-4" />}
            Run validated BFS
          </Button>
        </div>

        {runError !== null && <p className="text-destructive text-xs">{runError}</p>}

        {result === null ? (
          <EmptyState
            icon={Bug}
            title="Run the validated engine"
            description="The raw engine metadata appears here — visit order, distances, parent chains, queue size, and validation result."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">graph validated: {String(result.validatedGraph)}</Badge>
              <Badge variant="secondary">
                {result.metadata.visitedNodeCount} visited · depth {result.metadata.traversalDepth}
              </Badge>
              <Badge variant="secondary">{result.metadata.edgesExamined} edges examined</Badge>
              <Badge variant="secondary">
                {result.metadata.duplicateVisitsPrevented} duplicates prevented
              </Badge>
              <Badge variant="secondary">max queue {result.metadata.maxQueueSize}</Badge>
              <Badge variant="secondary">{result.metadata.traversalDurationMs.toFixed(2)} ms</Badge>
              {result.metadata.truncated && <Badge variant="destructive">truncated at depth</Badge>}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="pr-3 pb-1.5 font-medium">Node</th>
                    <th className="pr-3 pb-1.5 font-medium">Dist</th>
                    <th className="pr-3 pb-1.5 font-medium">Order</th>
                    <th className="pb-1.5 font-medium">Parents</th>
                  </tr>
                </thead>
                <tbody>
                  {result.nodes.map((node) => (
                    <tr key={node.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-3">
                        <span className="font-medium">
                          {nodeById.get(node.id)?.title ?? node.id}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 font-mono">{node.distance}</td>
                      <td className="py-1.5 pr-3 font-mono">{node.order}</td>
                      <td className="py-1.5">
                        {node.parentIds.length === 0 ? (
                          <span className="text-muted-foreground">entry</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {node.parentIds.map((parentId) => (
                              <Badge
                                key={parentId}
                                variant="outline"
                                className="font-mono text-[9px]"
                              >
                                {nodeById.get(parentId)?.title ?? parentId}
                              </Badge>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
