'use client'

import { usePipelineStory } from './pipeline-story'

/* Rotating "live system" status line. Shows the message for the current */
const STATUS_MESSAGES = [
  'Traversing knowledge graph — 18 nodes reachable',
  'Evaluating 12 rules in priority order',
  'Filtering by permission profile: analyst',
  'Assembling 1,024-token context package',
  'Context ready — synced to your LLM',
] as const

export function RotatingStatus() {
  const { stageIndex, isReady } = usePipelineStory()
  const message = STATUS_MESSAGES[stageIndex]

  return (
    <p
      className="flex max-w-full flex-wrap items-center justify-center gap-1.5 font-mono text-xs"
      aria-hidden="true"
    >
      <span className={isReady ? 'text-emerald-500' : 'text-sky-400'}>{isReady ? '✓' : '▸'}</span>
      {/* key remount replays the entrance animation on each stage change */}
      <span
        key={stageIndex}
        className={`cg-status-in inline-block ${isReady ? 'text-emerald-500' : 'text-muted-foreground'}`}
      >
        {message}
      </span>
      <span className="cg-blink text-foreground/60" aria-hidden="true">
        ▍
      </span>
    </p>
  )
}
