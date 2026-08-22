import type { LucideIcon } from 'lucide-react'
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
}

/**
 * Dashboard metric card with visual hierarchy.
 * - Primary: larger value, accent left border, prominent label
 * - Secondary: smaller value, muted styling
 *
 * Replaces the flat StatCard pattern where all metrics look identical.
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  badge,
  variant = 'secondary',
}: MetricCardProps) {
  const isPrimary = variant === 'primary'

  return (
    <Card className={cn('transition-colors', isPrimary && 'border-l-2 border-l-indigo-500/40')}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle
          className={cn(
            'font-medium',
            isPrimary ? 'text-foreground text-sm' : 'text-muted-foreground text-xs',
          )}
        >
          {label}
        </CardTitle>
        <Icon
          className={cn(
            'size-4 shrink-0',
            isPrimary ? 'text-indigo-500 dark:text-indigo-400' : 'text-muted-foreground',
          )}
        />
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className={cn('font-semibold tracking-tight', isPrimary ? 'text-3xl' : 'text-2xl')}>
            {value}
          </span>
          {badge !== undefined && (
            <Badge variant="outline" className="text-[10px] font-normal">
              {badge}
            </Badge>
          )}
        </div>
        {hint !== undefined && <p className="text-muted-foreground text-xs">{hint}</p>}
      </CardContent>
    </Card>
  )
}
