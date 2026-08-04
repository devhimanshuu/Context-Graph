'use client'

import { useEffect, useState } from 'react'

/**
 * Rotating "live system" status line. Cycles through pipeline phases like a
 * real context-assembly run, ending on a ready state. Decorative (aria-hidden)
 * — the static description below the headline carries the real message.
 * Pauses on the final message and freezes under prefers-reduced-motion.
 */
const STATUS_MESSAGES = [
  { text: 'Traversing knowledge graph — 18 nodes reachable' },
  { text: 'Evaluating 12 rules in priority order' },
  { text: 'Filtering by permission profile: analyst' },
  { text: 'Assembling 1,024-token context package' },
  { text: 'Context ready — synced to your LLM' },
] as const

const CYCLE_MS = 2800

export function RotatingStatus() {
  const [index, setIndex] = useState(0)
  const done = index === STATUS_MESSAGES.length - 1
  const current = STATUS_MESSAGES[index]

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setIndex((i) => (i + 1) % STATUS_MESSAGES.length), CYCLE_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <p className="flex items-center gap-1.5 font-mono text-xs" aria-hidden="true">
      <span className={done ? 'text-emerald-500' : 'text-sky-400'}>{done ? '✓' : '▸'}</span>
      {/* key remount replays the entrance animation on each rotation */}
      <span
        key={index}
        className={`cg-status-in text-muted-foreground inline-block ${done ? 'text-emerald-500' : ''}`}
      >
        {current.text}
      </span>
      <span className="cg-blink text-foreground/60" aria-hidden="true">
        ▍
      </span>
    </p>
  )
}
