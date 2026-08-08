import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  hint?: string
  /** Short tag e.g. "Phase 2" indicating when the metric becomes live. */
  badge?: string
}

/** Reusable metric card for dashboard overviews. */
export function StatCard({ label, value, icon: Icon, hint, badge }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
        <Icon className="text-muted-foreground size-4 shrink-0" />
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight">{value}</span>
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
