'use client'

import * as React from 'react'
import { Boxes, CircleAlert, Coins, Package, Sparkles, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { useApi } from '@/components/dashboard/api-provider'
import { ContextQueryPanel } from '@/components/dashboard/context-query-panel'
import { ContextPackageSummary } from '@/components/dashboard/context-package-summary'
import { RuleExplanationPanel } from '@/components/dashboard/rule-explanation-panel'
import { useKnowledgeNodes } from '@/hooks/use-api-query'
import { cn } from '@/lib/utils'
import type { CompressionHint, ContextPackage } from '@/lib/api/types'

const HINT_STYLES: Record<CompressionHint, string> = {
  FULL: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  SUMMARY: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  COMPRESSED: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  REFERENCE_ONLY: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400',
}

export default function ContextsPage() {
  const { client, bootstrap, status } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null

  const nodes = useKnowledgeNodes(workspaceId)

  const [result, setResult] = React.useState<ContextPackage | null>(null)
  const [running, setRunning] = React.useState(false)
  const [runError, setRunError] = React.useState<string | null>(null)

  const nodeList = React.useMemo(() => nodes.data ?? [], [nodes.data])

  const runAssembly = React.useCallback(
    async (submission: {
      entryNodeId: string
      maxDepth: number
      strategy: 'bfs' | 'weighted'
      tokenBudget: number
      maxCandidates: number
    }) => {
      if (client === null || workspaceId === null) return
      setRunning(true)
      setRunError(null)
      try {
        setResult(
          await client.resolveContext(workspaceId, {
            ...submission,
            // DEBUG returns the per-stage results + full per-node rule traces.
            mode: 'DEBUG',
          }),
        )
      } catch (error) {
        setRunError(error instanceof Error ? error.message : 'Context pipeline failed')
        setResult(null)
      } finally {
        setRunning(false)
      }
    },
    [client, workspaceId],
  )

  const titleById = React.useMemo(
    () => new Map(nodeList.map((node) => [node.id, node.title])),
    [nodeList],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contexts"
        description="Resolve a ranked, token-budgeted context package — authorization, graph traversal, deterministic rules, candidate ranking, then budget fitting."
      >
        <Badge variant="outline" className="gap-1.5">
          <Package className="size-3" />
          Context Pipeline · Phases 4–7
        </Badge>
      </PageHeader>

      {status === 'error' && (
        <Card>
          <CardContent className="text-destructive flex items-center gap-2 py-4 text-sm">
            <CircleAlert className="size-4" />
            API unavailable — context resolution needs the NestJS backend.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ContextQueryPanel
            nodes={nodeList}
            loading={nodes.isPending}
            running={running}
            disabled={workspaceId === null || status === 'error'}
            error={runError}
            emptyHint={
              status === 'ready'
                ? 'No nodes are visible in this workspace for your authorization scope. Switch the demo user in the top bar (e.g. to Dr. Amelia Chen) to resolve a context.'
                : undefined
            }
            onResolve={(submission) => void runAssembly(submission)}
            benchmarkEnabled={false}
          />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>Context package</CardTitle>
              <CardDescription>
                Ranked, explainable candidates fitted into your budget, with the full 10-stage
                execution trace.
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
                title="Resolve a context package"
                description="Pick an entry node and run the pipeline — reachable nodes pass the rule pipeline, survivors are ranked deterministically, and the top candidates are fitted into a token budget."
              />
            ) : (
              <div className="space-y-5">
                <ContextPackageSummary result={result} />
                <ContextSections result={result} />
                <RuleExplanationPanel
                  nodes={[
                    ...result.candidates.map((candidate) => ({
                      id: candidate.candidateId,
                      title: candidate.title,
                      included: true,
                    })),
                    ...result.exclusions.map((exclusion) => ({
                      id: exclusion.nodeId,
                      title: titleById.get(exclusion.nodeId) ?? exclusion.nodeId,
                      included: false,
                      excludedByBudget: exclusion.excludedByBudget,
                    })),
                  ]}
                  explanations={result.exclusions.map((exclusion) => ({
                    nodeId: exclusion.nodeId,
                    included: false,
                    finalReasonCode: exclusion.finalReasonCode,
                    failingRuleId: exclusion.failingRuleId,
                    ruleResults: exclusion.ruleResults ?? [],
                  }))}
                  titleById={titleById}
                />
              </div>
            )}
          </CardContent>
        </Card>
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
        description="Every reachable node was removed by the rule pipeline, or the ranking/budget cut all of them. Check the explanations below."
      />
    )
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Ranked context</h3>
      {result.candidates.map((candidate) => (
        <div
          key={candidate.candidateId}
          className="border-border bg-card space-y-1.5 rounded-lg border p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold',
                candidate.rank === 1
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground',
              )}
              title={`Rank ${candidate.rank} by deterministic score`}
            >
              {candidate.rank === 1 ? <Trophy className="size-3.5" /> : `#${candidate.rank}`}
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">
              score {candidate.score.toFixed(1)}
            </span>
            <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-semibold">
              {candidate.type}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'gap-1 px-1.5 py-0 text-[9px] font-semibold',
                HINT_STYLES[candidate.compressionHint],
              )}
              title={`Compression hint: ${candidate.compressionHint}`}
            >
              <Sparkles className="size-2.5" />
              {candidate.compressionHint}
            </Badge>
            <span className="text-sm font-medium">{candidate.title}</span>
            <span className="text-muted-foreground ml-auto font-mono text-[10px]">
              d={candidate.distance} · ~{candidate.tokens} tokens
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
