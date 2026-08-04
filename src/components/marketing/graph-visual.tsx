import { cn } from '@/lib/utils'

/**
 * Decorative animated knowledge-graph scene.
 *
 * Pure presentational SVG — the real graph visualization (React Flow) is a
 * Phase 3 deliverable. Renders a small deterministic graph with pulsing nodes
 * and animated edges inside a product-like frame.
 */
interface GraphVisualProps {
  className?: string
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

const TONE_GLOW: Record<Node['tone'], string> = {
  fact: 'shadow-[0_0_12px_2px_rgba(56,189,248,0.5)]',
  constraint: 'shadow-[0_0_12px_2px_rgba(251,191,36,0.5)]',
  decision: 'shadow-[0_0_12px_2px_rgba(129,140,248,0.5)]',
}

export function GraphVisual({ className }: GraphVisualProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Faint grid behind the scene */}
      <div className="cg-grid-bg absolute inset-0" aria-hidden="true" />

      <svg
        viewBox="0 0 500 190"
        className="relative w-full"
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
          return (
            <line
              key={index}
              x1={source.cx}
              y1={source.cy}
              x2={target.cx}
              y2={target.cy}
              stroke="url(#cg-edge-gradient)"
              strokeWidth={edge.dashed ? 1.5 : 2}
              className={cn(edge.dashed && 'animate-cg-dash text-muted-foreground')}
            />
          )
        })}

        {NODES.map((node, index) => (
          <g key={index}>
            <circle
              cx={node.cx}
              cy={node.cy}
              r={index === 1 ? 9 : 7}
              className={cn(
                TONE_FILL[node.tone],
                TONE_GLOW[node.tone],
                index % 3 === 0 && 'animate-cg-pulse',
              )}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}
