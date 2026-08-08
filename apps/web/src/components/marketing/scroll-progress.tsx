'use client'

import { useEffect, useRef } from 'react'

/* Thin gradient scroll-progress bar pinned to the top edge of the sticky */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    let frame = 0
    const update = () => {
      frame = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(doc.scrollTop / max, 1) : 0
      bar.style.width = `${progress * 100}%`
      bar.style.opacity = progress > 0.001 ? '1' : '0'
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[2px] w-0 bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 opacity-0 shadow-[0_0_10px_2px_rgba(var(--cg-glow),0.45)] transition-opacity duration-300"
    />
  )
}
