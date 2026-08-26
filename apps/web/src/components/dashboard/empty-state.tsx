import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  className?: string
  children?: React.ReactNode
  /** Optional gradient color for the icon area. */
  gradient?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky'
}

const GRADIENT_CLASSES = {
  indigo: 'from-indigo-500/15 to-fuchsia-500/15 text-indigo-500 dark:text-indigo-400',
  emerald: 'from-emerald-500/15 to-teal-500/15 text-emerald-500 dark:text-emerald-400',
  amber: 'from-amber-500/15 to-orange-500/15 text-amber-500 dark:text-amber-400',
  rose: 'from-rose-500/15 to-pink-500/15 text-rose-500 dark:text-rose-400',
  sky: 'from-sky-500/15 to-blue-500/15 text-sky-500 dark:text-sky-400',
} as const

/**
 * Premium empty state with gradient icon area, clear messaging,
 * and optional CTA children.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
  gradient = 'indigo',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center',
        className,
      )}
    >
      <div
        className={cn(
          'flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm',
          GRADIENT_CLASSES[gradient],
        )}
      >
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold tracking-tight">{title}</p>
        <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">{description}</p>
      </div>
      {children !== undefined && <div className="mt-1">{children}</div>}
    </div>
  )
}
