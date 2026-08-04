'use client'

import { useEffect, useRef, type CSSProperties } from 'react'

/**
 * Animated hero backdrop — a layered, CSS-only motion system that makes the
 * landing hero feel alive:
 *
 *  1. Base wireframe grid + a slowly crawling grid layer
 *  2. Three drifting aurora orbs (indigo / sky / fuchsia)
 *  3. Ascending data-stream packets
 *  4. A periodic monitor-style scan beam
 *  5. Twinkling graph particles
 *
 * A gentle mouse parallax translates the aurora layer (CSS variables `--px` /
 * `--py`) so the scene reacts to the cursor. Parallax writes straight to the
 * layer node's style so pointer movement never triggers a React re-render.
 * Decorative only; the real graph is rendered beside it in `<Hero />`.
 */
const STREAMS = [
  { left: '6%', delay: '0s', duration: '9s' },
  { left: '14%', delay: '2.4s', duration: '11s' },
  { left: '22%', delay: '1.2s', duration: '8s' },
  { left: '38%', delay: '3.6s', duration: '10s' },
  { left: '55%', delay: '0.8s', duration: '12s' },
  { left: '71%', delay: '2.8s', duration: '9s' },
  { left: '84%', delay: '1.8s', duration: '11s' },
  { left: '93%', delay: '4.2s', duration: '8s' },
] as const

const PARTICLES = [
  { left: '12%', top: '22%', delay: '0s', size: 'size-1' },
  { left: '26%', top: '64%', delay: '1.1s', size: 'size-1.5' },
  { left: '40%', top: '30%', delay: '2.2s', size: 'size-1' },
  { left: '58%', top: '72%', delay: '0.6s', size: 'size-1' },
  { left: '72%', top: '18%', delay: '1.7s', size: 'size-1.5' },
  { left: '84%', top: '56%', delay: '2.8s', size: 'size-1' },
  { left: '64%', top: '42%', delay: '3.4s', size: 'size-1' },
  { left: '18%', top: '82%', delay: '4.1s', size: 'size-1' },
  { left: '90%', top: '84%', delay: '1.4s', size: 'size-1.5' },
  { left: '48%', top: '12%', delay: '2.9s', size: 'size-1' },
] as const

/** CSSProperties with the custom `--*` variables this component sets. */
type CssVars = CSSProperties & Partial<Record<`--${string}`, string | number>>

export function HeroBackdrop() {
  const parallaxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const layer = parallaxRef.current
    if (!layer) return

    const onPointerMove = (event: PointerEvent) => {
      const x = event.clientX / window.innerWidth - 0.5
      const y = event.clientY / window.innerHeight - 0.5
      layer.style.setProperty('--px', `${x * 28}px`)
      layer.style.setProperty('--py', `${y * 28}px`)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => window.removeEventListener('pointermove', onPointerMove)
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 1 · Wireframe grids */}
      <div className="cg-grid-bg absolute inset-0" />
      {/* Self-positioned in CSS (inset: -44px) for the seamless crawl loop. */}
      <div className="cg-grid-flow" />

      {/* 2 · Aurora orbs (parallax layer) */}
      <div
        ref={parallaxRef}
        className="absolute inset-0 will-change-transform"
        style={{ '--px': '0px', '--py': '0px' } as CssVars}
      >
        <div className="absolute -top-48 left-1/2 -ml-[27rem] h-[36rem] w-[54rem]">
          <div className="cg-aurora-a h-full w-full rounded-full bg-indigo-600/15 blur-[110px]" />
        </div>
        <div className="absolute top-1/4 -right-40 h-96 w-96">
          <div className="cg-aurora-b h-full w-full rounded-full bg-sky-500/15 blur-[100px]" />
        </div>
        <div className="absolute -bottom-40 -left-32 h-[28rem] w-[28rem]">
          <div className="cg-aurora-c h-full w-full rounded-full bg-fuchsia-500/15 blur-[100px]" />
        </div>
      </div>

      {/* 3 · Data streams */}
      <div className="absolute inset-y-0 w-full">
        {STREAMS.map((stream) => (
          <div
            key={stream.left}
            className="via-border/40 absolute inset-y-0 w-px bg-gradient-to-b from-transparent to-transparent"
            style={{ left: stream.left }}
          >
            <span
              className="cg-stream absolute top-0 left-0 h-10 w-px rounded-full bg-gradient-to-b from-transparent via-sky-300/70 to-indigo-300/70 shadow-[0_0_10px_2px_rgba(56,189,248,0.35)]"
              style={
                {
                  '--stream-delay': stream.delay,
                  '--stream-duration': stream.duration,
                } as CssVars
              }
            />
          </div>
        ))}
      </div>

      {/* 4 · Scan beam */}
      <div className="cg-scan absolute inset-x-0 h-40 bg-gradient-to-b from-transparent via-indigo-400/10 to-transparent" />

      {/* 5 · Particles */}
      {PARTICLES.map((particle) => (
        <span
          key={`${particle.left}-${particle.top}`}
          className={`cg-particle absolute rounded-full bg-sky-300/80 shadow-[0_0_8px_2px_rgba(125,211,252,0.45)] ${particle.size}`}
          style={
            {
              left: particle.left,
              top: particle.top,
              '--twinkle-delay': particle.delay,
            } as CssVars
          }
        />
      ))}

      {/* Fade into the page background at the bottom edge */}
      <div className="from-background absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t to-transparent" />
    </div>
  )
}
