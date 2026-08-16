'use client'

import * as React from 'react'
import { Gauge, LoaderCircle, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { KnowledgeNode } from '@/lib/api/types'

const MAX_DEPTH_OPTIONS = [1, 2, 3, 4, 5] as const
const TOKEN_BUDGET_OPTIONS = [512, 1024, 2048, 4096, 8192, 16384] as const
const MAX_CANDIDATE_OPTIONS = [10, 20, 30, 50] as const

export interface ContextQueryInput {
  entryNodeId: string
  maxDepth: number
  strategy: 'bfs' | 'weighted'
  tokenBudget: number
  maxCandidates: number
}

/** Everything a page needs to execute a query in either mode. */
export interface ContextQuerySubmission {
  /** Single mode: the selected entry node. */
  entryNodeId: string
  maxDepth: number
  strategy: 'bfs' | 'weighted'
  tokenBudget: number
  maxCandidates: number
  /** Benchmark mode: run every node as an entry point. */
  benchmark: boolean
  /** All visible nodes — the benchmark population. */
  nodes: readonly KnowledgeNode[]
}

/**
 * Shared resolve-query panel (entry node, depth, strategy, token budget, max
 * candidates). Owns its form state; pages receive the values through
 * `onResolve`. Used by the Contexts page (package output) and the Pipeline
 * page (animated trace).
 */
export function ContextQueryPanel({
  nodes,
  loading,
  running,
  disabled,
  emptyHint,
  error,
  submitLabel = 'Resolve context',
  benchmarkLabel = 'Run every node',
  benchmarkEnabled = true,
  onResolve,
}: {
  nodes: readonly KnowledgeNode[]
  loading: boolean
  running: boolean
  /** Disable the form entirely (e.g. no workspace yet). */
  disabled: boolean
  emptyHint?: React.ReactNode
  error?: string | null
  submitLabel?: string
  /** Label next to the benchmark toggle (default "Run every node"). */
  benchmarkLabel?: string
  /** Hide the benchmark toggle entirely (e.g. single-package surfaces). */
  benchmarkEnabled?: boolean
  onResolve: (input: ContextQuerySubmission) => void
}) {
  const [entryNodeId, setEntryNodeId] = React.useState<string>('')
  const [maxDepth, setMaxDepth] = React.useState<number>(3)
  const [strategy, setStrategy] = React.useState<'bfs' | 'weighted'>('bfs')
  const [tokenBudget, setTokenBudget] = React.useState<number>(4096)
  const [maxCandidates, setMaxCandidates] = React.useState<number>(30)
  const [benchmark, setBenchmark] = React.useState(false)
  const benchmarkAvailable = benchmarkEnabled !== false && nodes.length > 0

  React.useEffect(() => {
    if (entryNodeId === '' && nodes.length > 0) {
      setEntryNodeId(nodes[0]?.id ?? '')
    }
  }, [nodes, entryNodeId])

  const submit = () => {
    if (benchmarkAvailable && benchmark) {
      // Benchmark mode: every visible node becomes an entry point.
      onResolve({
        entryNodeId: nodes[0]?.id ?? '',
        maxDepth,
        strategy,
        tokenBudget,
        maxCandidates,
        benchmark: true,
        nodes,
      })
      return
    }
    if (entryNodeId === '') return
    onResolve({
      entryNodeId,
      maxDepth,
      strategy,
      tokenBudget,
      maxCandidates,
      benchmark: false,
      nodes,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resolve query</CardTitle>
        <CardDescription>
          Entry node → BFS/weighted expansion → rule pipeline → ranked candidates → token budget.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {benchmarkAvailable && (
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Execution mode</label>
            <div className="bg-muted/60 flex gap-0.5 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setBenchmark(false)}
                className={cn(
                  'flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                  !benchmark
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Single node
              </button>
              <button
                type="button"
                onClick={() => setBenchmark(true)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                  benchmark
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Gauge className="size-3" />
                Benchmark
              </button>
            </div>
            {benchmark && (
              <p className="text-muted-foreground text-[10px]">
                Resolves every node in the workspace ({nodes.length}) as an entry point and renders
                a per-stage duration heatmap.
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium">Entry node</label>
          {loading || nodes.length === 0 ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <Select
              value={entryNodeId}
              onValueChange={setEntryNodeId}
              disabled={benchmarkAvailable && benchmark}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an entry node" />
              </SelectTrigger>
              <SelectContent>
                {nodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {benchmarkAvailable && benchmark && (
            <p className="text-muted-foreground text-[10px]">All nodes — entry selector disabled</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Max depth</label>
            <Select value={String(maxDepth)} onValueChange={(value) => setMaxDepth(Number(value))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAX_DEPTH_OPTIONS.map((depth) => (
                  <SelectItem key={depth} value={String(depth)}>
                    {depth} hop{depth > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Strategy</label>
            <Select
              value={strategy}
              onValueChange={(value) => setStrategy(value as 'bfs' | 'weighted')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bfs">BFS (hops)</SelectItem>
                <SelectItem value="weighted">Weighted (cost)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Token budget</label>
            <Select
              value={String(tokenBudget)}
              onValueChange={(value) => setTokenBudget(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOKEN_BUDGET_OPTIONS.map((budget) => (
                  <SelectItem key={budget} value={String(budget)}>
                    {budget.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Max candidates</label>
            <Select
              value={String(maxCandidates)}
              onValueChange={(value) => setMaxCandidates(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAX_CANDIDATE_OPTIONS.map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    {count}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={submit}
          disabled={
            running || disabled || (benchmarkAvailable && benchmark ? false : entryNodeId === '')
          }
        >
          {running ? <LoaderCircle className="animate-spin" /> : <Play className="size-4" />}
          {benchmarkAvailable && benchmark
            ? `${benchmarkLabel} (${nodes.length} nodes)`
            : submitLabel}
        </Button>

        {error !== null && error !== undefined && (
          <p className="text-destructive text-xs">{error}</p>
        )}

        {emptyHint !== undefined && !loading && nodes.length === 0 && (
          <p className="text-muted-foreground bg-muted/40 rounded-lg p-2.5 text-xs">{emptyHint}</p>
        )}
      </CardContent>
    </Card>
  )
}
