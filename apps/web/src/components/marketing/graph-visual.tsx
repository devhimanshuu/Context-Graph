'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/* Decorative animated knowledge-graph scene. Pure presentational SVG — the real graph visualization (React Flow) is a */
interface GraphVisualProps {
  className?: string
  /* Node indices to highlight (others dim to 30%). When omitted, every node */
  activeIndices?: readonly number[]
  /** Ready state: every node and edge turns emerald (pipeline complete). */
  ready?: boolean
  /** Node index currently being explored (shows a persistent tooltip). */
  exploreIndex?: number | null
  /** Enables click-to-explore when provided. */
  onNodeClick?: (index: number) => void
}

interface Node {
  cx: number
  cy: number
  /** Node type maps to a semantic color. */
  tone: 'fact' | 'constraint' | 'decision'
}

interface Edge {
  from: number
  to: number
  dashed?: boolean
}

const NODES: Node[] = [
  { cx: 70, cy: 60, tone: 'fact' },
  { cx: 190, cy: 40, tone: 'decision' },
  { cx: 190, cy: 130, tone: 'constraint' },
  { cx: 310, cy: 70, tone: 'fact' },
  { cx: 310, cy: 150, tone: 'decision' },
  { cx: 430, cy: 45, tone: 'decision' },
  { cx: 430, cy: 125, tone: 'fact' },
]

const EDGES: Edge[] = [
  { from: 0, to: 1 },
  { from: 0, to: 2, dashed: true },
  { from: 1, to: 3 },
  { from: 2, to: 4, dashed: true },
  { from: 3, to: 5 },
  { from: 4, to: 5 },
  { from: 4, to: 6, dashed: true },
  { from: 5, to: 6 },
]

const TONE_FILL: Record<Node['tone'], string> = {
  fact: 'fill-sky-400',
  constraint: 'fill-amber-400',
  decision: 'fill-indigo-400',
}

const TONE_DROP: Record<Node['tone'], string> = {
  fact: 'drop-shadow-[0_0_6px_rgba(56,189,248,0.9)]',
  constraint: 'drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]',
  decision: 'drop-shadow-[0_0_6px_rgba(129,140,248,0.9)]',
}

const TONE_LABEL: Record<Node['tone'], string> = {
  fact: 'FACT',
  constraint: 'CONSTRAINT',
  decision: 'DECISION',
}

/* 1-hop neighbors per node — the active set a click explores. */
export const NODE_NEIGHBORHOODS: readonly number[][] = NODES.map((_, index) => {
  const set = new Set<number>([index])
  for (const edge of EDGES) {
    if (edge.from === index) set.add(edge.to)
    if (edge.to === index) set.add(edge.from)
  }
  return [...set].sort((a, b) => a - b)
})

/* Radius of each node's core — the bigger decision hub gets a larger ball. */
const CORE_R = (index: number, active: boolean) => {
  const activeR = index === 1 ? 9 : 7
  return active ? activeR : Math.max(activeR - 3, 4)
}

/* Traveling signal dots — a glow packet rides each active edge, staggered so */
const SIGNAL_DURATION = 1.2

/* Type pill rendered above a hovered or explored node. */
function NodeTooltip({ node }: { node: Node }) {
  const label = TONE_LABEL[node.tone]
  const x = node.cx
  const y = node.cy - 26
  const w = label.length * 6.2 + 18
  return (
    <g pointerEvents="none" aria-hidden="true">
      <rect
        x={x - w / 2}
        y={y - 11}
        width={w}
        height={20}
        rx={6}
        className="fill-background stroke-border drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
        strokeWidth={1}
      />
      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        className="fill-foreground font-mono text-[9px] tracking-[0.12em]"
      >
        {label}
      </text>
    </g>
  )
}

export function GraphVisual({
  className,
  activeIndices,
  ready = false,
  exploreIndex = null,
  onNodeClick,
}: GraphVisualProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  // Stage signature — remounts traveling dots when the stage changes so the
  // signal restarts in sync with the traversal story.
  const signature = activeIndices?.join(',') ?? 'all'

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Faint grid behind the scene */}
      <div className="cg-grid-bg absolute inset-0" aria-hidden="true" />

      {/* Periodic radar sweep across the scene */}
      <div
        className="cg-graph-scan pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-sky-400/10 to-transparent"
        aria-hidden="true"
      />

      <svg
        viewBox="0 0 500 190"
        className={cn(
          'relative w-full transition-colors duration-700',
          ready && 'text-emerald-400',
        )}
        role="img"
        aria-label="Abstract knowledge graph: connected nodes and typed edges"
      >
        <defs>
          <linearGradient id="cg-edge-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {EDGES.map((edge, index) => {
          const source = NODES[edge.from]
          const target = NODES[edge.to]
          // Edges that touch no highlighted node recede during the traversal story; color follows the svg's
          // currentColor so the ready state (text-emerald-400) tints dashed and solid edges alike.
          const edgeActive = activeIndices
            ? activeIndices.includes(edge.from) || activeIndices.includes(edge.to)
            : true
          return (
            <g
              key={index}
              className={cn('transition-opacity duration-500', !edgeActive && 'opacity-30')}
            >
              <line
                x1={source.cx}
                y1={source.cy}
                x2={target.cx}
                y2={target.cy}
                stroke="url(#cg-edge-gradient)"
                strokeWidth={edge.dashed ? 1.5 : 2}
                className={cn(edge.dashed && 'animate-cg-dash')}
              />
              {/* Signal packet riding the edge while the story is live. Uses
                  currentColor so it stays visible on both themes — white-ish on
                  dark, dark on light — with a brand-tinted glow. */}
              {edgeActive && !ready && (
                <circle
                  key={`${signature}-${index}`}
                  r={2.4}
                  fill="currentColor"
                  className="drop-shadow-[0_0_5px_rgba(var(--cg-glow),0.6)]"
                >
                  <animateMotion
                    dur={`${SIGNAL_DURATION}s`}
                    repeatCount="indefinite"
                    begin={`${(index * 0.2) % SIGNAL_DURATION}s`}
                    path={`M ${source.cx} ${source.cy} L ${target.cx} ${target.cy}`}
                  />
                </circle>
              )}
            </g>
          )
        })}

        {NODES.map((node, index) => {
          const active = activeIndices ? activeIndices.includes(index) : true
          const isHovered = hoverIndex === index
          const isExplored = exploreIndex === index
          return (
            <g
              key={index}
              onClick={onNodeClick ? () => onNodeClick(index) : undefined}
              onMouseEnter={onNodeClick ? () => setHoverIndex(index) : undefined}
              onMouseLeave={onNodeClick ? () => setHoverIndex(null) : undefined}
              className={cn(onNodeClick && 'cursor-pointer')}
              role={onNodeClick ? 'button' : undefined}
              aria-label={onNodeClick ? `${TONE_LABEL[node.tone]} node` : undefined}
            >
              {/* Type pill on hover or when explored */}
              {(isHovered || isExplored) && <NodeTooltip node={node} />}

              {/* Breathing halo — only on highlighted nodes, staggered */}
              {active && (
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={index === 1 ? 18 : 16}
                  className={cn(
                    'cg-node-halo transition-[fill] duration-500',
                    ready ? 'fill-emerald-400' : TONE_FILL[node.tone],
                  )}
                  style={!ready ? { animationDelay: `${(index % 5) * 0.4}s` } : undefined}
                />
              )}
              {/* Expanding confirmation ring once the pipeline is ready */}
              {ready && (
                <circle
                  key={`ring-${index}`}
                  cx={node.cx}
                  cy={node.cy}
                  r={7}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="cg-node-ring"
                />
              )}
              {/* Dashed selection ring while hovering */}
              {isHovered && (
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={index === 1 ? 12 : 10}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  className="opacity-60"
                />
              )}
              <circle
                cx={node.cx}
                cy={node.cy}
                className={cn(
                  'transition-[r,fill,opacity] duration-500 ease-out',
                  ready ? 'fill-emerald-400' : TONE_FILL[node.tone],
                  active &&
                    (ready ? 'drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]' : TONE_DROP[node.tone]),
                  !active && 'opacity-30',
                )}
                style={{ r: `${CORE_R(index, active)}px` }}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
