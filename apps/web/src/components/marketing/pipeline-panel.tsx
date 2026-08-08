'use client'

import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GraphVisual, NODE_NEIGHBORHOODS } from './graph-visual'
import { usePipelineStory } from './pipeline-story'

/* Live context-assembly panel: the knowledge graph lights up node-by-node per */
const TOKENS_BY_STAGE = [384, 512, 768, 1024, 1024] as const
const BUDGET = 4096
const ANIMATE_MS = 900

/** Graph node indices highlighted per stage (matches GraphVisual layout). */
const ACTIVE_BY_STAGE: number[][] = [
  [0, 3, 6], // traversal — facts discovered
  [2, 4], // rules — constraints evaluated
  [1, 4, 5], // permissions — decisions gated
  [0, 1, 2, 3, 4, 5, 6], // assembly — full subgraph
  [0, 1, 2, 3, 4, 5, 6], // ready — everything connected
]

/* Ambient glow tint per pipeline stage — mirrors the stage's semantic color. */
const STAGE_GLOW = [
  'bg-indigo-500/20',
  'bg-sky-500/20',
  'bg-fuchsia-500/20',
  'bg-violet-500/20',
  'bg-emerald-500/20',
] as const

export function PipelinePanel() {
  const { stageIndex, isReady, pin, pinNode, resume } = usePipelineStory()
  // Node exploration freezes the demo and shows the clicked node's neighborhood.
  const exploring = pin?.type === 'node'
  const activeIndices = exploring ? NODE_NEIGHBORHOODS[pin.index] : ACTIVE_BY_STAGE[stageIndex]
  const ready = !exploring && isReady
  // Clicking the explored node again resumes; any other node re-explores.
  const handleNodeClick = (index: number) => {
    if (exploring && pin.index === index) resume()
    else pinNode(index)
  }
  const target = TOKENS_BY_STAGE[stageIndex]
  const [tokens, setTokens] = useState(0)
  const tokensRef = useRef(0)

  // Animate toward the current stage's token target whenever it changes.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTokens(target)
      tokensRef.current = target
      return
    }

    let raf = 0
    const from = tokensRef.current
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min((now - start) / ANIMATE_MS, 1)
      // Ease-out so the counter decelerates as it lands on the target.
      const value = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 2)))
      setTokens(value)
      tokensRef.current = value
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  const pct = Math.min((tokens / BUDGET) * 100, 100)

  return (
    <div className="relative w-full max-w-md">
      {/* Ambient glow behind the panel — tints per stage, cross-fades smoothly */}
      <div
        className={cn(
          'pointer-events-none absolute -inset-5 rounded-[2rem] blur-2xl transition-colors duration-700',
          STAGE_GLOW[stageIndex],
        )}
        aria-hidden="true"
      />
      {/* Shimmering gradient hairline border (1px ring around the panel) */}
      <div
        className="animate-cg-shimmer pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/45 via-sky-500/45 to-fuchsia-500/45"
        aria-hidden="true"
      />

      <div className="bg-background/90 relative overflow-hidden rounded-[13px] border shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="text-muted-foreground flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] uppercase">
            {!isReady && (
              <span className="relative flex size-1.5" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
            )}
            Context assembly
          </span>
          {exploring ? (
            <button
              type="button"
              onClick={resume}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 px-2.5 py-1 font-mono text-[10px] tracking-[0.2em] text-emerald-500 uppercase transition-colors hover:bg-emerald-500/10"
            >
              <Play className="size-3" />
              Resume demo
            </button>
          ) : (
            <span
              className={cn(
                'font-mono text-[10px] tracking-[0.2em] uppercase',
                isReady ? 'text-emerald-500' : 'text-sky-400',
              )}
            >
              {isReady ? '✓ Ready' : `▸ Stage ${stageIndex + 1} of 5`}
            </span>
          )}
        </div>

        <div className="relative">
          <GraphVisual
            activeIndices={activeIndices}
            ready={ready}
            exploreIndex={exploring ? pin.index : null}
            onNodeClick={handleNodeClick}
            className="px-2 py-3"
          />
          {/* Affordance hint — fades out once a node is explored */}
          {!exploring && (
            <span className="text-muted-foreground/40 pointer-events-none absolute inset-x-0 bottom-1 text-center font-mono text-[10px] tracking-[0.25em] uppercase">
              Click a node to explore
            </span>
          )}
        </div>

        <div className="px-5 pb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-mono tracking-wider uppercase">
              Token budget
            </span>
            <span className="font-mono">
              <span className="text-foreground font-semibold tabular-nums">
                {tokens.toLocaleString()}
              </span>
              <span className="text-muted-foreground"> / {BUDGET.toLocaleString()}</span>
            </span>
          </div>
          <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full" aria-hidden="true">
            <div
              className={cn(
                'h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 transition-[width] duration-150 ease-out',
                isReady &&
                  'from-emerald-500 via-emerald-400 to-teal-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
