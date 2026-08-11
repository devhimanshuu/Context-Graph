'use client'

import * as React from 'react'
import { Boxes, CircleAlert, Coins, LoaderCircle, Package, Play, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { RuleExplanationPanel } from '@/components/dashboard/rule-explanation-panel'
import { useApiData } from '@/hooks/use-api-data'
import type { ContextPackage } from '@/lib/api/types'

const MAX_DEPTH_OPTIONS = [1, 2, 3, 4, 5] as const
const TOKEN_BUDGET_OPTIONS = [512, 1024, 2048, 4096, 8192, 16384] as const

export default function ContextsPage() {
  const { client, bootstrap, status } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null

  const nodes = useApiData(
    async (api) => (workspaceId === null ? [] : api.knowledgeNodes(workspaceId)),
    [workspaceId],
  )

  const [entryNodeId, setEntryNodeId] = React.useState<string>('')
  const [maxDepth, setMaxDepth] = React.useState<number>(3)
  const [strategy, setStrategy] = React.useState<'bfs' | 'weighted'>('bfs')
  const [tokenBudget, setTokenBudget] = React.useState<number>(4096)
  const [result, setResult] = React.useState<ContextPackage | null>(null)
  const [running, setRunning] = React.useState(false)
  const [runError, setRunError] = React.useState<string | null>(null)

  const nodeList = React.useMemo(() => nodes.data ?? [], [nodes.data])
  React.useEffect(() => {
    if (entryNodeId === '' && nodeList.length > 0) {
      setEntryNodeId(nodeList[0]?.id ?? '')
    }
  }, [nodeList, entryNodeId])

  const runAssembly = React.useCallback(async () => {
    if (client === null || workspaceId === null || entryNodeId === '') return
    setRunning(true)
    setRunError(null)
    try {
      setResult(
        await client.assembleContext(workspaceId, {
          entryNodeId,
          maxDepth,
          strategy,
          tokenBudget,
        }),
      )
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Context assembly failed')
      setResult(null)
    } finally {
      setRunning(false)
    }
  }, [client, workspaceId, entryNodeId, maxDepth, strategy, tokenBudget])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contexts"
        description="Assemble token-budgeted, permission-aware context packages — graph traversal, then deterministic rules, then budget fitting."
      >
        <Badge variant="outline" className="gap-1.5">
          <Package className="size-3" />
          Context Assembly · Phase 4 + 5 + 6
        </Badge>
      </PageHeader>

      {status === 'error' && (
        <Card>
          <CardContent className="text-destructive flex items-center gap-2 py-4 text-sm">
            <CircleAlert className="size-4" />
            API unavailable — context assembly needs the NestJS backend.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Assembly query</CardTitle>
            <CardDescription>
              Entry node → BFS/weighted expansion → rule pipeline → token-budgeted package.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">Entry node</label>
              {nodes.loading || nodeList.length === 0 ? (
                <Skeleton className="h-8 w-full" />
              ) : (
                <Select value={entryNodeId} onValueChange={setEntryNodeId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an entry node" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodeList.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium">Max depth</label>
                <Select
                  value={String(maxDepth)}
                  onValueChange={(value) => setMaxDepth(Number(value))}
                >
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
                      {budget.toLocaleString()} tokens
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={() => void runAssembly()}
              disabled={running || entryNodeId === ''}
            >
              {running ? <LoaderCircle className="animate-spin" /> : <Play className="size-4" />}
              Assemble context
            </Button>

            {runError !== null && <p className="text-destructive text-xs">{runError}</p>}

            {status === 'ready' && !nodes.loading && nodeList.length === 0 && (
              <p className="text-muted-foreground bg-muted/40 rounded-lg p-2.5 text-xs">
                No nodes are visible in this workspace for your authorization scope. Switch the demo
                user in the top bar (e.g. to Dr. Amelia Chen) to assemble a context.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>Context package</CardTitle>
              <CardDescription>
                Rule-filtered candidates fitted into your token budget, with a full include/exclude
                explanation
              </CardDescription>
            </div>
            {result !== null && (
              <Badge variant="outline" className="gap-1.5">
                <Coins className="size-3" />
                {result.tokensUsed.toLocaleString()} / {result.tokenBudget.toLocaleString()}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {result === null ? (
              <EmptyState
                icon={Boxes}
                title="Assemble a context package"
                description="Pick an entry node and run assembly — reachable nodes pass the rule pipeline and the survivors are fitted into a token budget, each with an explanation."
              />
            ) : (
              <div className="space-y-5">
                <PackageSummary result={result} />
                <ContextSections result={result} />
                <RuleExplanationPanel
                  nodes={result.nodes.map((node) => ({
                    id: node.id,
                    title: node.title,
                    included: node.included,
                    excludedByBudget: node.excludedByBudget,
                  }))}
                  explanations={result.explanations}
                  titleById={new Map(nodeList.map((node) => [node.id, node.title]))}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PackageSummary({ result }: { result: ContextPackage }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="size-3" />
          {result.funnel.reachable} reachable
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <Boxes className="size-3" />
          {result.funnel.candidates} after rules
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <Package className="size-3" />
          {result.funnel.included} in budget
        </Badge>
        <Badge variant="secondary">{(result.metrics.totalDurationMs ?? 0).toFixed(2)} ms</Badge>
        {result.truncated && (
          <Badge variant="destructive" className="gap-1">
            <CircleAlert className="size-3" />
            budget truncated
          </Badge>
        )}
      </div>

      <div className="border-border bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs">
        <span className="text-muted-foreground">Funnel</span>
        <span className="font-mono font-semibold">{result.funnel.reachable}</span>
        <span className="text-muted-foreground">→ rules →</span>
        <span className="font-mono font-semibold">{result.funnel.candidates}</span>
        <span className="text-muted-foreground">→ budget →</span>
        <span className="font-mono font-semibold">{result.funnel.included}</span>
        <span className="text-muted-foreground">tokens {result.tokensUsed.toLocaleString()}</span>
      </div>
    </div>
  )
}

function ContextSections({ result }: { result: ContextPackage }) {
  if (result.candidates.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No candidates survived"
        description="Every reachable node was removed by the rule pipeline, or the budget excluded all of them. Check the explanations below."
      />
    )
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Assembled context</h3>
      {result.candidates.map((candidate, index) => (
        <div key={candidate.id} className="border-border bg-card space-y-1.5 rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground font-mono text-[10px]">
              {index + 1} · d={candidate.distance}
            </span>
            <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-semibold">
              {candidate.type}
            </Badge>
            <span className="text-sm font-medium">{candidate.title}</span>
            <span className="text-muted-foreground ml-auto font-mono text-[10px]">
              ~{candidate.tokens} tokens
            </span>
          </div>
          {candidate.complianceTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {candidate.complianceTags.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted text-muted-foreground rounded px-1 py-px font-mono text-[9px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="text-muted-foreground line-clamp-4 text-xs leading-relaxed">
            {candidate.content}
          </p>
        </div>
      ))}
    </div>
  )
}
