'use client'

import * as React from 'react'
import { CircleAlert, LoaderCircle, Network, Play, Route, ShieldBan, Waypoints } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useApi } from '@/components/dashboard/api-provider'
import { KnowledgeGraphView } from '@/components/dashboard/knowledge-graph-view'
import { useApiData } from '@/hooks/use-api-data'
import type { GraphEdge, ReachabilityResult } from '@/lib/api/types'

const NODE_TYPE_OPTIONS = ['FACT', 'CONSTRAINT', 'DECISION', 'ANTI_PATTERN'] as const

const TYPE_CHIP_TONE: Record<string, string> = {
  FACT: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  CONSTRAINT: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  DECISION: 'border-violet-500/40 text-violet-600 dark:text-violet-400',
  ANTI_PATTERN: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
}

const MAX_DEPTH_OPTIONS = [1, 2, 3, 4, 5] as const
const RELATIONSHIP_TONE: Record<string, string> = {
  SUPPORTS: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  REQUIRES: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  DERIVED_FROM: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  SUPERSEDES: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  CONTRADICTS: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

export default function KnowledgeGraphPage() {
  const { client, bootstrap, status } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null

  const nodes = useApiData(
    async (api) => (workspaceId === null ? [] : api.knowledgeNodes(workspaceId)),
    [workspaceId],
  )
  const edges = useApiData(
    async (api) => (workspaceId === null ? [] : api.graphEdges(workspaceId)),
    [workspaceId],
  )

  const [entryNodeId, setEntryNodeId] = React.useState<string>('')
  const [maxDepth, setMaxDepth] = React.useState<number>(3)
  const [strategy, setStrategy] = React.useState<'bfs' | 'weighted'>('bfs')
  const [typeFilterMode, setTypeFilterMode] = React.useState<'highlight' | 'hide'>('highlight')
  const [activeTypes, setActiveTypes] = React.useState<Set<string>>(new Set([...NODE_TYPE_OPTIONS]))
  const [result, setResult] = React.useState<ReachabilityResult | null>(null)
  const [running, setRunning] = React.useState(false)
  const [runError, setRunError] = React.useState<string | null>(null)

  const toggleType = React.useCallback((type: string) => {
    setActiveTypes((current) => {
      const next = new Set(current)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  // Default the entry node to the first node once the list loads.
  const nodeList = React.useMemo(() => nodes.data ?? [], [nodes.data])
  React.useEffect(() => {
    if (entryNodeId === '' && nodeList.length > 0) {
      setEntryNodeId(nodeList[0]?.id ?? '')
    }
  }, [nodeList, entryNodeId])

  const runReachability = React.useCallback(async () => {
    if (client === null || workspaceId === null || entryNodeId === '') return
    setRunning(true)
    setRunError(null)
    try {
      setResult(await client.reachability(workspaceId, { entryNodeId, maxDepth, strategy }))
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Reachability run failed')
      setResult(null)
    } finally {
      setRunning(false)
    }
  }, [client, workspaceId, entryNodeId, maxDepth, strategy])

  const nodeById = React.useMemo(() => new Map(nodeList.map((node) => [node.id, node])), [nodeList])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Graph"
        description="Run the BFS reachability engine against the seeded knowledge graph — results are filtered by your authorization context."
      >
        <Badge variant="outline" className="gap-1.5">
          <Network className="size-3" />
          Graph Engine · Phase 4 + 5
        </Badge>
      </PageHeader>

      {status === 'error' && (
        <Card>
          <CardContent className="text-destructive flex items-center gap-2 py-4 text-sm">
            <CircleAlert className="size-4" />
            API unavailable — the explorer needs the NestJS backend.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Traversal query</CardTitle>
            <CardDescription>
              Entry node → BFS/weighted expansion toward ancestors, then permission filtering.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">Entry node</label>
              {nodes.loading || nodeList.length === 0 ? (
                <Skeleton className="h-8 w-full" />
              ) : (
                <Select value={entryNodeId} onValueChange={setEntryNodeId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an entry node" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodeList.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium">Max depth</label>
                <Select
                  value={String(maxDepth)}
                  onValueChange={(value) => setMaxDepth(Number(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAX_DEPTH_OPTIONS.map((depth) => (
                      <SelectItem key={depth} value={String(depth)}>
                        {depth} hop{depth > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium">Strategy</label>
                <Select
                  value={strategy}
                  onValueChange={(value) => setStrategy(value as 'bfs' | 'weighted')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bfs">BFS (hops)</SelectItem>
                    <SelectItem value="weighted">Weighted (cost)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium">Node types</label>
              <div className="bg-muted/60 flex gap-0.5 rounded-lg p-0.5">
                {(['highlight', 'hide'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTypeFilterMode(mode)}
                    className={cn(
                      'flex-1 rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors',
                      typeFilterMode === mode
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {NODE_TYPE_OPTIONS.map((type) => {
                  const active = activeTypes.has(type)
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      aria-pressed={active}
                      className={cn(
                        'rounded-md border px-2 py-1 text-[11px] font-medium transition-all',
                        active
                          ? cn(TYPE_CHIP_TONE[type] ?? 'border-border', 'bg-background')
                          : 'border-border text-muted-foreground/60 opacity-60 hover:opacity-100',
                      )}
                    >
                      {type}
                    </button>
                  )
                })}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => void runReachability()}
              disabled={running || entryNodeId === ''}
            >
              {running ? <LoaderCircle className="animate-spin" /> : <Play className="size-4" />}
              Run traversal
            </Button>

            {runError !== null && <p className="text-destructive text-xs">{runError}</p>}

            {status === 'ready' && !nodes.loading && nodeList.length === 0 && (
              <p className="text-muted-foreground bg-muted/40 rounded-lg p-2.5 text-xs">
                No nodes are visible in this workspace for your authorization scope. Switch the demo
                user in the top bar (e.g. to Dr. Amelia Chen) to see the graph.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>Reachable nodes</CardTitle>
              <CardDescription>
                Interactive graph — layers by distance, edges typed, withheld nodes dimmed
              </CardDescription>
            </div>
            {result !== null && (
              <Badge variant="outline" className="gap-1.5">
                <Route className="size-3" />
                {result.nodeIds.length} reachable
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {result === null ? (
              <EmptyState
                icon={Waypoints}
                title="Run a traversal to explore the graph"
                description="Pick an entry node above and run the engine — reachable nodes appear here with their distance, discovery order, and whether permission filtering withheld any."
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">Depth {result.metadata?.traversalDepth ?? 0}</Badge>
                  <Badge variant="secondary">
                    {result.metadata?.visitedNodeCount ?? result.nodeIds.length} visited
                  </Badge>
                  <Badge variant="secondary">
                    {result.metadata?.duplicateVisitsPrevented ?? 0} duplicates prevented
                  </Badge>
                  <Badge variant="secondary">
                    {(result.metadata?.traversalDurationMs ?? 0).toFixed(2)} ms
                  </Badge>
                  {(result.filteredNodeCount ?? 0) > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <ShieldBan className="size-3" />
                      {result.filteredNodeCount} withheld by permissions
                    </Badge>
                  )}
                </div>

                <KnowledgeGraphView
                  result={result}
                  nodes={nodeList}
                  edges={edges.data ?? []}
                  maxDepth={maxDepth}
                  strategy={strategy}
                  typeFilter={{ mode: typeFilterMode, types: activeTypes }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Graph edges</CardTitle>
          <CardDescription>
            Typed, directed relationships in the workspace (source → target)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {edges.loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (edges.data ?? []).length === 0 ? (
            <EmptyState
              icon={Network}
              title="No edges"
              description="The workspace has no graph edges yet."
            />
          ) : (
            <ul className="space-y-1.5">
              {(edges.data ?? []).map((edge) => (
                <EdgeRow key={edge.id} edge={edge} nodeById={nodeById} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EdgeRow({
  edge,
  nodeById,
}: {
  edge: GraphEdge
  nodeById: Map<string, { title: string }>
}) {
  return (
    <li className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium">{nodeById.get(edge.sourceId)?.title ?? edge.sourceId}</span>
      <span className="text-muted-foreground">→</span>
      <span className="font-medium">{nodeById.get(edge.targetId)?.title ?? edge.targetId}</span>
      <Badge
        variant="outline"
        className={`text-[10px] font-normal ${RELATIONSHIP_TONE[edge.relationshipType] ?? ''}`}
      >
        {edge.relationshipType}
      </Badge>
      <span className="text-muted-foreground ml-auto text-xs">w={edge.weight}</span>
    </li>
  )
}
