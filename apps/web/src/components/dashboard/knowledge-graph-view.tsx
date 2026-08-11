'use client'

import * as React from 'react'
import { useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Lock, RotateCcw, ShieldBan } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { GraphEdge, KnowledgeNode, ReachabilityResult } from '@/lib/api/types'
import { reconstructUpwardReachable } from '@/lib/graph/reconstruct-reachable'

/* Layout constants — layered by distance, stacked within a layer. */
const NODE_WIDTH = 220
const COLUMN_GAP = 260
const ROW_HEIGHT = 104

/** Node type → badge tone + minimap color. */
const NODE_TYPE_TONE: Record<string, { badge: string; dot: string }> = {
  FACT: {
    badge: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
    dot: '#0ea5e9',
  },
  CONSTRAINT: {
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    dot: '#f59e0b',
  },
  DECISION: {
    badge: 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400',
    dot: '#8b5cf6',
  },
  ANTI_PATTERN: {
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
    dot: '#f43f5e',
  },
}

/** Relationship type → edge stroke + label tone. */
const RELATIONSHIP_TONE: Record<string, { stroke: string }> = {
  SUPPORTS: { stroke: '#10b981' },
  REQUIRES: { stroke: '#0ea5e9' },
  DERIVED_FROM: { stroke: '#8b5cf6' },
  SUPERSEDES: { stroke: '#f59e0b' },
  CONTRADICTS: { stroke: '#f43f5e' },
}
const FALLBACK_TONE = { stroke: '#94a3b8' }

interface GraphNodeData extends Record<string, unknown> {
  label: string
  nodeType: string
  status: string
  distance: number
  order: number
  cost: number | null
  filtered: boolean
  complianceTags: string[]
  /** Animation delay (ms) for the discovery-order replay. */
  revealDelay: number
  /** Type-filtered (highlight mode): dimmed but still visible. */
  typeDimmed: boolean
}

type GraphFlowNode = Node<GraphNodeData>

/** Extra data attached to every rendered edge for the inspect panel. */
interface GraphEdgeData extends Record<string, unknown> {
  relationshipType: string
  weight: number
  sourceTitle: string
  targetTitle: string
  dimmed: boolean
}

function GraphNodeView({ data, selected }: NodeProps<GraphFlowNode>) {
  const tone = NODE_TYPE_TONE[data.nodeType] ?? {
    badge: 'border-muted-foreground/30 bg-muted text-muted-foreground',
    dot: '#94a3b8',
  }

  return (
    <div
      className={cn(
        'bg-card w-[220px] rounded-lg border px-3 py-2 shadow-sm transition-[box-shadow,opacity]',
        selected ? 'ring-ring ring-2' : 'hover:shadow-md',
        data.filtered
          ? 'border-muted-foreground/40 border-dashed opacity-60'
          : data.typeDimmed
            ? 'border-border opacity-35'
            : 'border-border',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground/70 !size-2 !border-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-muted-foreground/70 !size-2 !border-0"
      />
      {/* The discovery replay animates this inner layer; type-dimming lives on
          the outer card, so toggling the filter never restarts the reveal. */}
      <div
        className={cn(!data.filtered && 'cg-node-reveal')}
        style={data.filtered ? undefined : { animationDelay: `${data.revealDelay}ms` }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground font-mono text-[10px]">
            #{data.order} · d={data.distance}
            {data.cost !== null ? ` · c=${data.cost}` : ''}
          </span>
          {data.filtered ? (
            <Lock className="text-muted-foreground size-3 shrink-0" />
          ) : (
            <Badge
              variant="outline"
              className={cn('px-1.5 py-0 text-[9px] font-semibold', tone.badge)}
            >
              {data.nodeType}
            </Badge>
          )}
        </div>
        <p
          className={cn(
            'mt-1 text-xs leading-snug',
            data.filtered ? 'text-muted-foreground font-medium' : 'font-medium',
          )}
        >
          {data.label}
        </p>
        {data.filtered ? (
          <p className="text-muted-foreground/80 mt-1 text-[10px]">
            Reachable — not in your access scope
          </p>
        ) : (
          data.complianceTags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {data.complianceTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="bg-muted text-muted-foreground rounded px-1 py-px font-mono text-[9px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export interface NodeTypeFilter {
  /** 'highlight' dims non-matching nodes; 'hide' removes them entirely. */
  mode: 'highlight' | 'hide'
  /** Node types that match the filter. */
  types: ReadonlySet<string>
}

export interface KnowledgeGraphViewProps {
  result: ReachabilityResult
  /** Authorized knowledge nodes — supplies titles/metadata for visible nodes. */
  nodes: KnowledgeNode[]
  /** Full workspace edges (already exposed by the API). */
  edges: GraphEdge[]
  /** Requested depth cap, needed to mirror the engine's truncation. */
  maxDepth: number
  strategy: 'bfs' | 'weighted'
  /** Optional node-type filter. Omitted = no filtering. */
  typeFilter?: NodeTypeFilter
}

/**
 * Interactive React Flow visualization of a reachability result.
 *
 * The traversal result only contains nodes the caller may read. To explain
 * the `filteredNodeCount` visually, the pre-permission reachable set is
 * reconstructed from the (fully visible) workspace edge list and rendered
 * dimmed — the engine's no-structure-leak contract is untouched.
 */
export function KnowledgeGraphView({
  result,
  nodes,
  edges,
  maxDepth,
  strategy,
  typeFilter,
}: KnowledgeGraphViewProps) {
  const { resolvedTheme } = useTheme()
  const [inspectedId, setInspectedId] = useState<string | null>(null)
  const [inspectedEdgeId, setInspectedEdgeId] = useState<string | null>(null)
  const [replayTick, setReplayTick] = useState(0)

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])

  const {
    nodes: flowNodes,
    edges: flowEdges,
    filteredIds,
  } = useMemo(() => {
    const reconstruction = reconstructUpwardReachable(result.entryNodeId, edges, maxDepth)
    const authorizedSet = new Set(result.nodeIds)
    const filteredSet = new Set(reconstruction.ids.filter((id) => !authorizedSet.has(id)))

    // Node-type filter: highlight dims non-matching nodes, hide removes them.
    // Restricted (permission-withheld) nodes are exempt — their dimming is an
    // access statement, not a type choice.
    const filterMode = typeFilter?.mode ?? 'highlight'
    const activeTypes = typeFilter?.types
    const typeHidden = new Set<string>()
    const typeDimmed = new Set<string>()
    if (activeTypes !== undefined) {
      for (const id of reconstruction.ids) {
        if (filteredSet.has(id)) continue
        const type = nodeById.get(id)?.type
        if (type === undefined || activeTypes.has(type)) continue
        if (filterMode === 'hide') typeHidden.add(id)
        else typeDimmed.add(id)
      }
    }

    // Discovery replay: the whole sequence completes in ~5s, never slower
    // than one node per 120 ms or faster than 260 ms.
    const revealStepMs = Math.max(
      120,
      Math.min(260, Math.round(5000 / Math.max(reconstruction.ids.length, 1))),
    )

    // Group reachable ids by distance, ordered by discovery order for a stable layout.
    const byDistance = new Map<number, string[]>()
    for (const id of reconstruction.ids) {
      const distance = reconstruction.distances[id] ?? 0
      const level = byDistance.get(distance)
      if (level === undefined) byDistance.set(distance, [id])
      else level.push(id)
    }
    const levelRows = new Map<string, number>()
    for (const [distance, ids] of byDistance) {
      ids.sort((a, b) => (reconstruction.order[a] ?? 0) - (reconstruction.order[b] ?? 0))
      ids.forEach((id, index) => levelRows.set(id, index))
      byDistance.set(distance, ids)
    }

    const flowNodes: GraphFlowNode[] = reconstruction.ids
      .filter((id) => !typeHidden.has(id))
      .map((id) => {
        const filtered = filteredSet.has(id)
        const knowledge = nodeById.get(id)
        const distance = reconstruction.distances[id] ?? 0
        const levelCount = (byDistance.get(distance) ?? []).length
        const row = levelRows.get(id) ?? 0
        return {
          id,
          type: 'graph',
          position: {
            x: distance * COLUMN_GAP,
            y: (row - (levelCount - 1) / 2) * ROW_HEIGHT,
          },
          data: {
            label: filtered ? 'Restricted node' : (knowledge?.title ?? 'Untitled node'),
            nodeType: filtered ? 'RESTRICTED' : (knowledge?.type ?? ''),
            status: filtered ? '' : (knowledge?.status ?? ''),
            distance,
            order: reconstruction.order[id] ?? 0,
            cost: strategy === 'weighted' ? (result.costs?.[id] ?? null) : null,
            filtered,
            complianceTags: filtered ? [] : (knowledge?.complianceTags ?? []),
            revealDelay: (reconstruction.order[id] ?? 0) * revealStepMs,
            typeDimmed: typeDimmed.has(id),
          },
          style: { width: NODE_WIDTH },
        }
      })

    const shownIds = new Set(reconstruction.ids)
    const flowEdges: Edge<GraphEdgeData>[] = edges
      .filter(
        (edge) =>
          shownIds.has(edge.sourceId) &&
          shownIds.has(edge.targetId) &&
          !typeHidden.has(edge.sourceId) &&
          !typeHidden.has(edge.targetId),
      )
      .map((edge) => {
        const typeFilteredEndpoint =
          filterMode === 'highlight' &&
          (typeDimmed.has(edge.sourceId) || typeDimmed.has(edge.targetId))
        const dimmed =
          filteredSet.has(edge.sourceId) || filteredSet.has(edge.targetId) || typeFilteredEndpoint
        const tone = RELATIONSHIP_TONE[edge.relationshipType] ?? FALLBACK_TONE
        const targetOpacity = dimmed ? 0.25 : 0.85
        const sourceOrder = reconstruction.order[edge.sourceId] ?? 0
        const targetOrder = reconstruction.order[edge.targetId] ?? 0
        return {
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          label: edge.relationshipType,
          className: 'cg-edge-reveal',
          data: {
            relationshipType: edge.relationshipType,
            weight: edge.weight,
            sourceTitle: nodeById.get(edge.sourceId)?.title ?? edge.sourceId,
            targetTitle: nodeById.get(edge.targetId)?.title ?? edge.targetId,
            dimmed,
          },
          labelStyle: {
            fill: tone.stroke,
            fontSize: 9,
            fontWeight: 600,
            fontFamily: 'inherit',
          },
          labelBgStyle: {
            fill: 'var(--card)',
            fillOpacity: 0.95,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: tone.stroke },
          style: {
            stroke: tone.stroke,
            strokeWidth: dimmed ? 1 : 1.5,
            opacity: targetOpacity,
            animationDelay: `${Math.max(sourceOrder, targetOrder) * revealStepMs + 120}ms`,
            '--edge-target-opacity': targetOpacity,
          },
        }
      })

    return { nodes: flowNodes, edges: flowEdges, filteredIds: [...filteredSet] }
  }, [result, edges, nodeById, maxDepth, strategy, typeFilter])

  const inspectedIdValue = inspectedId
  const inspectedNode =
    inspectedIdValue === null
      ? null
      : (flowNodes.find((node) => node.id === inspectedIdValue) ?? null)
  const inspected = inspectedIdValue === null ? null : (nodeById.get(inspectedIdValue) ?? null)
  const inspectedIsFiltered = inspectedIdValue !== null && filteredIds.includes(inspectedIdValue)
  const inspectedEdge =
    inspectedEdgeId === null
      ? null
      : (flowEdges.find((edge) => edge.id === inspectedEdgeId) ?? null)

  return (
    <div className="relative">
      <div className="border-border bg-muted/20 h-[440px] overflow-hidden rounded-lg border">
        <ReactFlow<GraphFlowNode, Edge<GraphEdgeData>>
          key={`${result.entryNodeId}:${maxDepth}:${strategy}:${replayTick}`}
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={{ graph: GraphNodeView }}
          colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
          fitView
          fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: false }}
          onNodeClick={(_event, node) => {
            setInspectedEdgeId(null)
            setInspectedId(node.id)
          }}
          onEdgeClick={(_event, edge) => {
            setInspectedId(null)
            setInspectedEdgeId(edge.id)
          }}
          onPaneClick={() => {
            setInspectedId(null)
            setInspectedEdgeId(null)
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
          <Panel position="top-left" className="!m-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-card/90 h-7 gap-1 text-xs shadow-sm backdrop-blur"
              onClick={() => setReplayTick((tick) => tick + 1)}
            >
              <RotateCcw className="size-3" />
              Replay discovery
            </Button>
          </Panel>
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeColor={(node) => {
              const data = node.data as unknown as GraphNodeData
              return data.filtered ? '#94a3b8' : (NODE_TYPE_TONE[data.nodeType]?.dot ?? '#94a3b8')
            }}
          />
          <Panel position="top-right" className="!m-3">
            <div className="bg-card/90 border-border pointer-events-auto max-w-[280px] rounded-lg border p-3 shadow-sm backdrop-blur">
              {inspectedEdge !== null ? (
                <EdgeDetails edge={inspectedEdge} />
              ) : inspectedIdValue === null ? (
                <p className="text-muted-foreground text-xs">
                  Click a node or an edge to inspect it — type, distance, weight and access state.
                </p>
              ) : inspectedIsFiltered ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldBan className="text-muted-foreground size-3.5" />
                    <p className="text-xs font-semibold">Restricted node</p>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    This node is reachable from your entry point but was withheld by the permission
                    engine — you don&apos;t have clearance to read it. Its title and content are
                    intentionally hidden.
                  </p>
                </div>
              ) : (
                inspectedNode !== null &&
                inspected !== null && (
                  <div className="space-y-1.5">
                    <p className="text-xs leading-snug font-semibold">{inspected.title}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[9px] font-normal">
                        {inspected.type}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] font-normal">
                        {inspected.status}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] font-normal">
                        v{inspected.version}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground font-mono text-[10px]">
                      #{inspectedNode.data.order} · d={inspectedNode.data.distance}
                      {strategy === 'weighted' && ` · c=${inspectedNode.data.cost ?? 0}`}
                    </p>
                    {inspected.complianceTags.length > 0 && (
                      <p className="text-muted-foreground font-mono text-[10px]">
                        {inspected.complianceTags.join(' · ')}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="bg-muted-foreground/70 size-2 rounded-full" />
          nodes layered by distance from entry (left → ancestors)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500/70" />
          nodes light up in discovery order — replay to watch again
        </span>
        <span className="flex items-center gap-1.5">
          <span className="border-muted-foreground/50 size-2 rounded-full border border-dashed" />
          reachable but withheld by permissions (dimmed)
        </span>
        <span className="flex items-center gap-1.5">
          edges labeled by relationship type, arrows point child → parent
        </span>
      </div>
    </div>
  )
}

/** Inspect panel for a clicked edge: type, weight, and source → target titles. */
function EdgeDetails({ edge }: { edge: Edge<GraphEdgeData> }) {
  const data = edge.data
  if (data === undefined) return null
  const { relationshipType, weight, sourceTitle, targetTitle, dimmed } = data
  const tone = RELATIONSHIP_TONE[relationshipType] ?? FALLBACK_TONE

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: tone.stroke }}
          aria-hidden="true"
        />
        <p className="text-xs font-semibold">{relationshipType}</p>
      </div>
      <p className="text-muted-foreground font-mono text-[10px]">w = {weight}</p>
      <p className="text-xs leading-relaxed">
        <span className="font-medium">{sourceTitle}</span>
        <span className="text-muted-foreground mx-1">→</span>
        <span className="font-medium">{targetTitle}</span>
        <span className="text-muted-foreground block text-[10px]">child → parent</span>
      </p>
      {dimmed && (
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Dimmed because one endpoint is reachable but not in your access scope.
        </p>
      )}
    </div>
  )
}
