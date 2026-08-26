import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  /** Optional action slot rendered on the right (buttons, badges, ...). */
  children?: React.ReactNode
  /** Optional gradient background for hero-style headers. */
  gradient?: boolean
  /** Optional icon to show next to the title. */
  icon?: React.ElementType
  /** Optional badge or status indicator. */
  badge?: React.ReactNode
}

/**
 * Premium page header with visual hierarchy.
 * - Default: clean title + description with subtle bottom border
 * - Gradient: hero-style header with gradient wash background
 */
export function PageHeader({
  title,
  description,
  children,
  gradient = false,
  icon: Icon,
  badge,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between',
        gradient &&
          '-mx-6 -mt-6 border-b bg-gradient-to-br from-indigo-500/[0.04] via-transparent to-fuchsia-500/[0.04] px-6 py-6 md:-mx-8 md:px-8',
      )}
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          {Icon !== undefined && (
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15">
              <Icon className="size-4 text-indigo-500 dark:text-indigo-400" />
            </div>
          )}
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {badge !== undefined && badge}
        </div>
        {description !== undefined && (
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">{description}</p>
        )}
      </div>
      {children !== undefined && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
