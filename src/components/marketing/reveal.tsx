'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Delay (ms) before the reveal transition starts — used for staggering. */
  delay?: number
  /** Direction the block travels from while fading in. */
  direction?: RevealDirection
}

const HIDDEN: Record<RevealDirection, string> = {
  up: 'translate-y-7',
  down: '-translate-y-7',
  left: 'translate-x-8',
  right: '-translate-x-8',
  none: 'scale-[0.98]',
}

/**
 * Scroll-triggered reveal. Fades/slides its children into view the first time
 * they enter the viewport (IntersectionObserver), with a configurable delay
 * for stagger effects. Content is always in the DOM and occupies space while
 * hidden, so there is no layout shift. Respects `prefers-reduced-motion` by
 * rendering fully visible immediately.
 */
export function Reveal({ children, className, delay = 0, direction = 'up' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // No-JS / ancient-browser fallback: never leave content hidden.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        // Tailwind v4 maps translate-*/scale-* to the native `translate` and
        // `scale` CSS properties, so those must be in the transition list too.
        'transition-[opacity,translate,scale] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
        visible
          ? 'translate-x-0 translate-y-0 scale-100 opacity-100'
          : cn('opacity-0', HIDDEN[direction]),
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
