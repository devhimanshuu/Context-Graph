'use client'

import * as React from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** One rule verdict — structurally shared by the rule-engine and context responses. */
export interface RuleExplanationEntry {
  nodeId: string
  included: boolean
  finalReasonCode: string | null
  failingRuleId: string | null
  ruleResults: readonly {
    ruleId: string
    passed: boolean
    reasonCode: string
    reason: string
  }[]
}

export interface RuleExplanationNode {
  id: string
  title: string
  included: boolean
  excludedByBudget?: boolean
}

/**
 * The "why was this included/excluded" surface. Renders one row per evaluated
 * node; expanding a row reveals the full rule verdict trace. Shared by the
 * Rules page (engine runs) and the Contexts page (assembled packages).
 */
export function RuleExplanationPanel({
  nodes,
  explanations,
  titleById,
  emptyMessage,
}: {
  nodes: readonly RuleExplanationNode[]
  explanations: readonly RuleExplanationEntry[]
  titleById?: ReadonlyMap<string, string>
  emptyMessage?: string
}) {
  const explanationById = React.useMemo(
    () => new Map(explanations.map((entry) => [entry.nodeId, entry])),
    [explanations],
  )

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Why each node was included or excluded</h3>
      {nodes.length === 0 ? (
        <p className="text-muted-foreground text-xs">{emptyMessage ?? 'No nodes evaluated.'}</p>
      ) : (
        <div className="border-border divide-border divide-y rounded-lg border">
          {nodes.map((node) => (
            <ExplanationRow
              key={node.id}
              title={titleById?.get(node.id) ?? node.title}
              included={node.included}
              excludedByBudget={node.excludedByBudget ?? false}
              explanation={explanationById.get(node.id) ?? null}
              nodeId={node.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ExplanationRow({
  title,
  nodeId,
  included,
  excludedByBudget,
  explanation,
}: {
  title: string
  nodeId: string
  included: boolean
  excludedByBudget: boolean
  explanation: RuleExplanationEntry | null
}) {
  const [expanded, setExpanded] = React.useState(false)
  const failing = explanation?.ruleResults.find((result) => !result.passed)

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="hover:bg-muted/40 flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {expanded ? (
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
        {included ? (
          <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3" />
            included
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className={cn(
              'gap-1',
              excludedByBudget
                ? 'border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'border-rose-500/30 text-rose-600 dark:text-rose-400',
            )}
          >
            <XCircle className="size-3" />
            {excludedByBudget ? 'budget' : 'excluded'}
          </Badge>
        )}
      </button>

      {expanded && (
        <div className="border-border border-t px-3 py-2.5">
          {explanation === null ? (
            <p className="text-muted-foreground text-xs">No rule trace recorded for this node.</p>
          ) : (
            <div className="space-y-1.5">
              {!included && (
                <p className="text-muted-foreground text-xs">
                  Removed by <span className="font-mono">{explanation.failingRuleId}</span> —{' '}
                  <span className="font-mono">{explanation.finalReasonCode}</span>:{' '}
                  {failing?.reason ?? 'No failing verdict recorded'}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {explanation.ruleResults.map((verdict) => (
                  <Badge
                    key={verdict.ruleId}
                    variant="outline"
                    className={cn(
                      'gap-1 px-1.5 py-0 text-[10px] font-normal',
                      verdict.passed
                        ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'border-rose-500/30 text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {verdict.passed ? (
                      <CheckCircle2 className="size-2.5" />
                    ) : (
                      <XCircle className="size-2.5" />
                    )}
                    {verdict.ruleId}
                    {!verdict.passed && (
                      <span className="font-mono text-[9px] opacity-80">{verdict.reasonCode}</span>
                    )}
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground font-mono text-[9px]">{nodeId}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
