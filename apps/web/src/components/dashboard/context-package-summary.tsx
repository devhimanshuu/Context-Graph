'use client'

import { Boxes, CircleAlert, GitBranch, Package, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ContextPackage } from '@/lib/api/types'

/** Funnel chips + the count line for a resolved context package. Shared by the Contexts and Pipeline pages. */
export function ContextPackageSummary({ result }: { result: ContextPackage }) {
  const { funnel, metrics } = result.summary
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary" className="gap-1">
          <GitBranch className="size-3" />
          {funnel.reachable} reachable
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="size-3" />
          {funnel.authorized} authorized
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <Boxes className="size-3" />
          {funnel.ruleCandidates} after rules
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <Package className="size-3" />
          {funnel.included} in budget
        </Badge>
        <Badge variant="outline" className="font-mono">
          {metrics.totalDurationMs.toFixed(1)} ms
        </Badge>
        <Badge variant="outline" className="font-mono">
          v1 · {result.mode}
        </Badge>
        {result.truncated && (
          <Badge variant="destructive" className="gap-1">
            <CircleAlert className="size-3" />
            truncated
          </Badge>
        )}
      </div>

      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2.5 text-xs">
        <span className="text-muted-foreground">Funnel</span>
        <span className="font-mono font-semibold">{funnel.reachable}</span>
        <span className="text-muted-foreground">→ authz →</span>
        <span className="font-mono font-semibold">{funnel.authorized}</span>
        <span className="text-muted-foreground">→ rules →</span>
        <span className="font-mono font-semibold">{funnel.ruleCandidates}</span>
        <span className="text-muted-foreground">→ rank+budget →</span>
        <span className="font-mono font-semibold">{funnel.included}</span>
        <span className="text-muted-foreground">
          · {metrics.rankedCandidates} ranked · {metrics.excludedByRules} rule-cut ·{' '}
          {metrics.excludedByBudget} budget-cut · {metrics.excludedByRank} rank-cut
        </span>
      </div>
    </div>
  )
}
