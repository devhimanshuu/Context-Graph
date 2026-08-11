'use client'

import * as React from 'react'

export interface SpringOptions {
  /** Spring stiffness — how strongly the value is pulled toward the target. */
  readonly stiffness?: number
  /** Damping — how quickly oscillation decays (higher = stiffer, less bounce). */
  readonly damping?: number
  /** Snap tolerance below which the spring settles to the exact target. */
  readonly precision?: number
}

const DEFAULT_STIFFNESS = 190
const DEFAULT_DAMPING = 26
const DEFAULT_PRECISION = 0.05
/** Clamp the per-frame step so a background tab can never cause a jump. */
const MAX_DT = 1 / 30

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Animates a numeric value toward `target` with damped spring physics.
 *
 * Semi-implicit Euler integration on a requestAnimationFrame loop — no
 * dependencies, frame-rate independent (clamped dt), and settles to the exact
 * target once the spring rests. Retargeting mid-flight continues smoothly
 * from the current position. Respects `prefers-reduced-motion`.
 */
export function useSpringValue(target: number, options: SpringOptions = {}): number {
  const {
    stiffness = DEFAULT_STIFFNESS,
    damping = DEFAULT_DAMPING,
    precision = DEFAULT_PRECISION,
  } = options
  const [value, setValue] = React.useState(target)

  const targetRef = React.useRef(target)
  const valueRef = React.useRef(target)
  const velocityRef = React.useRef(0)
  const lastTimeRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (prefersReducedMotion()) {
      targetRef.current = target
      valueRef.current = target
      velocityRef.current = 0
      setValue(target)
      return
    }

    targetRef.current = target
    lastTimeRef.current = null
    let frame = 0

    const tick = (now: number) => {
      const previous = lastTimeRef.current ?? now
      lastTimeRef.current = now
      const dt = Math.min((now - previous) / 1000, MAX_DT)

      const current = valueRef.current
      velocityRef.current +=
        (-stiffness * (current - targetRef.current) - damping * velocityRef.current) * dt
      const next = current + velocityRef.current * dt
      valueRef.current = next
      setValue(next)

      const settled =
        Math.abs(targetRef.current - next) <= precision && Math.abs(velocityRef.current) < 0.5
      if (settled) {
        valueRef.current = targetRef.current
        setValue(targetRef.current)
        velocityRef.current = 0
      } else {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, stiffness, damping, precision])

  return value
}
