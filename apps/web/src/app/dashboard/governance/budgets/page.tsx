'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Plus, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'

interface Budget {
  budgetId: string
  type: string
  targetType: string | null
  targetId: string | null
  limit: number
  period: string
  currentUsage: number
  status: string
  usagePercentage: number
}

const STATUS_COLORS: Record<string, string> = {
  NORMAL: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  WARNING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  LIMIT_REACHED: 'bg-red-500/10 text-red-700 dark:text-red-400',
  BLOCKED: 'bg-red-500/10 text-red-700 dark:text-red-400',
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export default function BudgetsPage() {
  const { data: budgets, isLoading } = useQuery<Budget[]>({
    queryKey: ['governance', 'budgets'],
    queryFn: () => fetchJson('/api/v1/governance/budgets'),
  })
  const totalBudget = budgets?.reduce((s, b) => s + b.limit, 0) ?? 0
  const totalUsage = budgets?.reduce((s, b) => s + b.currentUsage, 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Cost control and spending limits</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Budget
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Budget
            </CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">${totalBudget.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Current Usage
            </CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">${totalUsage.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Remaining</CardTitle>
            <AlertTriangle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              ${Math.max(0, totalBudget - totalUsage).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={3} columns={5} />
          ) : budgets && budgets.length > 0 ? (
            <div className="space-y-3">
              {budgets.map((b) => (
                <div key={b.budgetId} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{b.type}</span>
                      <Badge className={STATUS_COLORS[b.status] ?? ''} variant="secondary">
                        {b.status}
                      </Badge>
                      <Badge variant="outline">{b.period}</Badge>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      ${b.currentUsage.toFixed(2)} / ${b.limit.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="bg-muted h-2 w-full rounded-full">
                      <div
                        className={`h-2 rounded-full transition-all ${b.usagePercentage > 80 ? 'bg-red-500' : b.usagePercentage > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, b.usagePercentage)}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {b.usagePercentage.toFixed(1)}% used
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-12 text-center">
              <DollarSign className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p>No budgets configured</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
