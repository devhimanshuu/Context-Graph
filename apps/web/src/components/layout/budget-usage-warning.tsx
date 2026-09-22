'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, DollarSign } from 'lucide-react'
import { useApi } from '@/components/dashboard/api-provider'
import { ROUTES } from '@/constants'
import { cn } from '@/lib/utils'

/**
 * Proactive budget guardrail: shown in the dashboard header once monthly
 * spend crosses 80% of budget. Polls lightly (60s) so it self-heals after
 * a budget top-up without a page reload.
 */
export function BudgetUsageWarning() {
  const { client } = useApi()

  const overviewQuery = useQuery({
    queryKey: ['governance-overview', 'budget-warning'],
    queryFn: () => {
      if (client === null) throw new Error('Not signed in')
      return client.governanceOverview()
    },
    enabled: client !== null,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  })

  const usage = overviewQuery.data?.budgetUsage
  if (usage === undefined || usage < 80) return null

  const critical = usage >= 95

  return (
    <Link
      href={ROUTES.governanceBudgets}
      title={`Budget usage at ${Math.round(usage)}% — open budgets`}
      className={cn(
        'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors sm:flex',
        critical
          ? 'border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400',
      )}
    >
      {critical ? <AlertTriangle className="size-3" /> : <DollarSign className="size-3" />}
      Budget {Math.round(usage)}%
    </Link>
  )
}
