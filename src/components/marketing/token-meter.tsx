'use client'

import { useEffect, useState } from 'react'

/**
 * Live token-budget meter for the hero's graph card. Counts up from 0 to the
 * assembled-context size with an ease-out curve while the gradient bar fills
 * — like the pipeline assembling context in real time. Jumps straight to the
 * final value under prefers-reduced-motion.
 */
const TARGET = 1024
const BUDGET = 4096
const DURATION_MS = 1800

export function TokenMeter() {
  const [tokens, setTokens] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTokens(TARGET)
      return
    }

    let raf = 0
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1)
      // Ease-out so the counter decelerates as it lands on the target.
      setTokens(Math.round(TARGET * (1 - Math.pow(1 - t, 2))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const pct = Math.min((tokens / BUDGET) * 100, 100)

  return (
    <div className="bg-background/60 flex flex-col gap-2 rounded-xl border px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="text-muted-foreground font-mono tracking-wider uppercase">
          Context package · token budget
        </span>
        <span className="font-mono">
          <span className="text-foreground font-semibold tabular-nums">
            {tokens.toLocaleString()}
          </span>
          <span className="text-muted-foreground"> / {BUDGET.toLocaleString()}</span>
        </span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden="true">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
