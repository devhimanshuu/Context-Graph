import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  icon: LucideIcon
  hint?: string
  badge?: string
  /** Primary metrics get larger value text and accent border. */
  variant?: 'primary' | 'secondary'
  /** Optional trend indicator: positive = up, negative = down. */
  trend?: { value: string; positive: boolean }
  /** Optional link wrapper. */
  href?: string
}

/**
 * Premium metric card with visual hierarchy.
 * - Primary: larger value, gradient left border, icon with glow
 * - Secondary: smaller value, muted styling
 * - Trend: optional up/down indicator with color coding
 * - Hover: subtle depth elevation
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  badge,
  variant = 'secondary',
  trend,
}: MetricCardProps) {
  const isPrimary = variant === 'primary'

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)]',
        'dark:hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]',
        isPrimary && 'border-l-2 border-l-indigo-500/50',
      )}
    >
      {/* Subtle gradient wash on primary cards */}
      {isPrimary && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-fuchsia-500/[0.03] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden="true"
        />
      )}

      <CardHeader className="relative flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle
          className={cn(
            'font-medium',
            isPrimary ? 'text-foreground text-sm' : 'text-muted-foreground text-xs',
          )}
        >
          {label}
        </CardTitle>
        <div
          className={cn(
            'flex size-8 items-center justify-center rounded-lg transition-all duration-300',
            isPrimary
              ? 'bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 text-indigo-500 group-hover:scale-110 dark:text-indigo-400'
              : 'bg-muted/60 text-muted-foreground group-hover:bg-muted',
          )}
        >
          <Icon className="size-4 shrink-0" />
        </div>
      </CardHeader>

      <CardContent className="relative space-y-1.5">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'font-bold tracking-tight tabular-nums',
              isPrimary ? 'text-3xl' : 'text-2xl',
            )}
          >
            {value}
          </span>
          {badge !== undefined && (
            <Badge variant="outline" className="text-[10px] font-normal">
              {badge}
            </Badge>
          )}
          {trend !== undefined && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-[11px] font-medium',
                trend.positive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400',
              )}
            >
              {trend.positive ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>
        {hint !== undefined && <p className="text-muted-foreground text-xs">{hint}</p>}
      </CardContent>
    </Card>
  )
}
