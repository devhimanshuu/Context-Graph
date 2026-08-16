'use client'

import * as React from 'react'
import { Flame, Timer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { heatColor } from '@/lib/graph/heat-color'

/** One benchmark run: the entry node and its per-stage timings (ms). */
export interface BenchmarkStageRow {
  entryNodeId: string
  entryTitle: string
  /** stageId → duration ms. */
  stageDurations: Record<string, number>
  totalMs: number
}

const STAGE_LABELS: Record<string, string> = {
  'request-validation': 'Validate',
  authorization: 'Authz',
  'entry-resolution': 'Entry',
  'graph-traversal': 'Traverse',
  'candidate-mapping': 'Map',
  'rule-engine': 'Rules',
  'candidate-build': 'Build',
  'candidate-ranking': 'Rank',
  'context-budget': 'Budget',
  'context-package': 'Package',
}

/**
 * Pipeline benchmark heatmap: one row per entry node, one column per stage,
 * cell intensity proportional to the stage duration. Normalized to the
 * slowest cell so relative hotspots are visible at a glance.
 */
export function StageDurationHeatmap({ rows }: { rows: readonly BenchmarkStageRow[] }) {
  const stageIds = React.useMemo(
    () => Object.keys(rows[0]?.stageDurations ?? {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows.length > 0 ? rows[0] : undefined],
  )
  const maxMs = React.useMemo(
    () => Math.max(0, ...rows.flatMap((row) => Object.values(row.stageDurations))),
    [rows],
  )

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Flame}
        title="No benchmark data"
        description="Run the pipeline in Benchmark mode to see the per-stage duration heatmap."
      />
    )
  }

  const averages = Object.fromEntries(
    stageIds.map((stageId) => [
      stageId,
      rows.reduce((sum, row) => sum + (row.stageDurations[stageId] ?? 0), 0) / rows.length,
    ]),
  )
  const averageTotal = Object.values(averages).reduce((sum, value) => sum + value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Flame className="size-4 text-orange-500" />
          Per-stage duration heatmap
        </CardTitle>
        <CardDescription>
          One row per entry node, one column per stage — cell intensity is proportional to duration,
          normalized to the slowest cell.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary" className="gap-1">
            <Timer className="size-3" />
            {rows.length} nodes benchmarked
          </Badge>
          <Badge variant="secondary">avg total {averageTotal.toFixed(1)} ms</Badge>
          <Badge variant="secondary">max stage {maxMs.toFixed(1)} ms</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="pr-3 pb-1.5 font-medium">Entry node</th>
                {stageIds.map((stageId) => (
                  <th key={stageId} className="pr-2 pb-1.5 text-right font-medium">
                    <span title={stageId}>{STAGE_LABELS[stageId] ?? stageId}</span>
                  </th>
                ))}
                <th className="pb-1.5 pl-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.entryNodeId} className="border-b last:border-0">
                  <td className="max-w-56 truncate py-1.5 pr-3 font-medium" title={row.entryNodeId}>
                    {row.entryTitle}
                  </td>
                  {stageIds.map((stageId) => {
                    const ms = row.stageDurations[stageId] ?? 0
                    return (
                      <td key={stageId} className="py-1 pr-2">
                        <span
                          className={`block rounded px-1.5 py-0.5 text-right font-mono tabular-nums ${heatColor(ms, maxMs)}`}
                          title={`${row.entryTitle} · ${STAGE_LABELS[stageId] ?? stageId}: ${ms.toFixed(2)} ms`}
                        >
                          {ms.toFixed(1)}
                        </span>
                      </td>
                    )
                  })}
                  <td className="py-1.5 pl-2 text-right font-mono font-semibold tabular-nums">
                    {row.totalMs.toFixed(1)}
                  </td>
                </tr>
              ))}
              <tr className="border-t font-medium">
                <td className="text-muted-foreground py-1.5 pr-3">Average</td>
                {stageIds.map((stageId) => (
                  <td key={stageId} className="py-1 pr-2">
                    <span
                      className={`block rounded px-1.5 py-0.5 text-right font-mono tabular-nums ${heatColor(averages[stageId] ?? 0, maxMs)}`}
                    >
                      {(averages[stageId] ?? 0).toFixed(1)}
                    </span>
                  </td>
                ))}
                <td className="text-muted-foreground py-1.5 pl-2 text-right font-mono tabular-nums">
                  {averageTotal.toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-muted-foreground">Slower</span>
          {[
            'bg-emerald-500/10',
            'bg-emerald-500/25',
            'bg-amber-500/25',
            'bg-orange-500/30',
            'bg-rose-500/40',
          ].map((tone) => (
            <span key={tone} className={`${tone} size-3 rounded-sm`} />
          ))}
          <span className="text-muted-foreground">Faster</span>
          <span className="text-muted-foreground ml-4">
            Cells show milliseconds; the right-most column is the per-run total.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
