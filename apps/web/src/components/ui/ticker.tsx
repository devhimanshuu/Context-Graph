import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TickerItem {
  label: string
  /** Tailwind color class for the leading dot, e.g. 'bg-sky-400'. Omit for no dot. */
  tone?: string
}

interface TickerProps {
  items: readonly TickerItem[]
  /** Optional label rendered at the head of each repeating group. */
  prefix?: ReactNode
  /* Number of identical groups rendered. Must stay even for the seamless */
  groups?: number
  /** Duration of one full pass, e.g. '30s'. */
  duration?: string
  /** Vertical padding / extra classes for the strip. */
  className?: string
  /** Width classes for the soft edge fades, e.g. 'w-24'. */
  fadeClassName?: string
  /** Draw top and bottom borders on the strip. */
  bordered?: boolean
}

/* Seamless scrolling ticker — a horizontal strip of items that loops forever. */
export function Ticker({
  items,
  prefix,
  groups = 4,
  duration = '30s',
  className,
  fadeClassName = 'w-24',
  bordered = false,
}: TickerProps) {
  // Nothing to tick — avoid rendering an empty strip with borders/fades.
  if (items.length === 0) return null

  // -50% of the strip equals (groups / 2) full groups — an integer multiple of
  // the repeating unit only when groups is even. Clamp to at least 2 groups.
  const groupCount = Math.max(2, groups % 2 === 0 ? groups : groups + 1)

  return (
    <div
      className={cn('relative overflow-hidden', bordered && 'border-border/80 border-y', className)}
    >
      <div className="cg-marquee flex w-max items-center" style={{ animationDuration: duration }}>
        {Array.from({ length: groupCount }, (_, index) => (
          <div key={index} aria-hidden={index > 0} className="flex items-center gap-10 pr-10">
            {prefix != null && (
              <span className="text-primary font-mono text-[10px] font-medium tracking-[0.25em] uppercase">
                {prefix}
              </span>
            )}
            {items.map((item) => (
              <span key={item.label} className="flex items-center gap-2 text-xs">
                {item.tone && (
                  <span className={`size-1.5 rounded-full ${item.tone}`} aria-hidden="true" />
                )}
                <span className="text-muted-foreground font-mono tracking-wider uppercase">
                  {item.label}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
      {/* Soft edge fades so items slide out of view naturally */}
      <div
        className={cn(
          'from-background pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r to-transparent',
          fadeClassName,
        )}
      />
      <div
        className={cn(
          'from-background pointer-events-none absolute inset-y-0 right-0 bg-gradient-to-l to-transparent',
          fadeClassName,
        )}
      />
    </div>
  )
}
