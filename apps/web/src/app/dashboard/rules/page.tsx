'use client'

import * as React from 'react'
import {
  CircleAlert,
  GitBranch,
  ListChecks,
  LoaderCircle,
  Play,
  ScrollText,
  ToggleLeft,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { RuleExplanationPanel } from '@/components/dashboard/rule-explanation-panel'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import {
  useKnowledgeNodes,
  useRuleEngineDefinition,
  useWorkspaceRules,
} from '@/hooks/use-api-query'
import type { RuleRunResponse } from '@/lib/api/types'

/** Human-readable metadata for each pipeline stage (kept in sync with the API's rule definitions). */
const STAGE_META: Record<string, { name: string; priority: number; description: string }> = {
  'global-injection': {
    name: 'Global knowledge injection',
    priority: 10,
    description: 'Merge organization-wide knowledge (policies, compliance rules) before filtering.',
  },
  isolation: {
    name: 'Organization isolation',
    priority: 20,
    description:
      'Defense-in-depth tenant boundary — nodes of another organization never enter the set.',
  },
  compliance: {
    name: 'Compliance clearance',
    priority: 30,
    description: 'Every node compliance tag must be covered by the principal\u2019s clearance.',
  },
  permission: {
    name: 'Permission authorization',
    priority: 40,
    description:
      'Re-verifies READ through the authorization engine for every node, including injected globals.',
  },
  temporal: {
    name: 'Temporal validity',
    priority: 50,
    description: 'Drops expired, superseded, future-effective and unpublished nodes.',
  },
  derivability: {
    name: 'Derivability filter',
    priority: 60,
    description:
      'Removes generic content a foundation model could derive; preserves organization-specific knowledge.',
  },
}

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  DRAFT: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  DISABLED: '',
  ARCHIVED: '',
}

export default function RulesPage() {
  const { client, bootstrap, status } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null

  const definition = useRuleEngineDefinition()
  const rules = useWorkspaceRules(workspaceId)
  const nodes = useKnowledgeNodes(workspaceId)

  const nodeList = React.useMemo(() => nodes.data ?? [], [nodes.data])
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [runResult, setRunResult] = React.useState<RuleRunResponse | null>(null)
  const [running, setRunning] = React.useState(false)
  const [runError, setRunError] = React.useState<string | null>(null)

  const toggleNode = React.useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = React.useCallback(() => {
    setSelectedIds((current) => {
      if (current.size === nodeList.length) return new Set()
      return new Set(nodeList.map((node) => node.id))
    })
  }, [nodeList])

  const runEngine = React.useCallback(async () => {
    if (client === null || workspaceId === null || selectedIds.size === 0) return
    setRunning(true)
    setRunError(null)
    try {
      setRunResult(await client.ruleEngineRun(workspaceId, { nodeIds: [...selectedIds] }))
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Rule run failed')
      setRunResult(null)
    } finally {
      setRunning(false)
    }
  }, [client, workspaceId, selectedIds])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rules"
        description="The deterministic rule pipeline, live from the Phase 6 rule engine."
      >
        <Badge variant="outline" className="gap-1.5">
          <GitBranch className="size-3" />
          Rule Engine · Phase 6
        </Badge>
      </PageHeader>

      {status === 'error' && (
        <Card>
          <CardContent className="text-destructive flex items-center gap-2 py-4 text-sm">
            <CircleAlert className="size-4" />
            API unavailable — the rule engine needs the NestJS backend.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pipeline definition</CardTitle>
          <CardDescription>
            Executed in explicit priority order — fetched from{' '}
            <code className="text-muted-foreground">GET /rule-engine/definition</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {' '}
          {definition.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : definition.data === undefined ? (
            <EmptyState
              icon={GitBranch}
              title="No definition available"
              description="Connect to the API to see the pipeline."
            />
          ) : (
            <ol className="space-y-2">
              {['global-injection', ...definition.data.stages].map((stageId, index) => {
                const meta = STAGE_META[stageId]
                if (meta === undefined) {
                  return (
                    <li key={stageId} className="text-muted-foreground text-sm">
                      {index}. {stageId}
                    </li>
                  )
                }
                return (
                  <li
                    key={stageId}
                    className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                  >
                    <span className="bg-muted text-muted-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs">
                      {meta.priority}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium">{meta.name}</p>
                      <p className="text-muted-foreground text-xs">{meta.description}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Run the engine</CardTitle>
          <CardDescription>
            Select knowledge nodes and execute the deterministic pipeline — full funnel with
            per-node reasons, from{' '}
            <code className="text-muted-foreground">POST /rule-engine/run</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-1">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <ListChecks className="size-3.5" />
                  Node set
                </p>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-muted-foreground hover:text-foreground text-[11px] font-medium underline-offset-2 hover:underline"
                >
                  {selectedIds.size === nodeList.length && nodeList.length > 0
                    ? 'Clear all'
                    : 'Select all'}
                </button>
              </div>

              {nodes.isPending ? (
                <Skeleton className="h-48 w-full" />
              ) : nodeList.length === 0 ? (
                <p className="text-muted-foreground bg-muted/40 rounded-lg p-2.5 text-xs">
                  No nodes are visible in this workspace for your authorization scope. Switch the
                  demo user in the top bar (e.g. to Dr. Amelia Chen).
                </p>
              ) : (
                <div className="border-border max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {nodeList.map((node) => (
                    <label
                      key={node.id}
                      className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(node.id)}
                        onChange={() => toggleNode(node.id)}
                        className="accent-primary size-3.5 shrink-0"
                      />
                      <span className="min-w-0 flex-1 truncate">{node.title}</span>
                      <Badge variant="outline" className="shrink-0 text-[9px] font-normal">
                        {node.type}
                      </Badge>
                    </label>
                  ))}
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => void runEngine()}
                disabled={running || selectedIds.size === 0}
              >
                {running ? <LoaderCircle className="animate-spin" /> : <Play className="size-4" />}
                Run rules{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </Button>
              {runError !== null && <p className="text-destructive text-xs">{runError}</p>}
            </div>

            <div className="lg:col-span-2">
              {runResult === null ? (
                <EmptyState
                  icon={GitBranch}
                  title="Run the pipeline to see the funnel"
                  description="Pick nodes on the left and run — every stage count and per-node verdict appears here."
                />
              ) : (
                <div className="space-y-5">
                  <RunFunnel result={runResult} />
                  <Survivors result={runResult} />
                  <RuleExplanationPanel
                    nodes={runResult.nodes.map((node) => ({
                      id: node.id,
                      title: node.title,
                      included: runResult.candidates.some((candidate) => candidate.id === node.id),
                    }))}
                    explanations={runResult.explanations}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stored context rules</CardTitle>
          <CardDescription>
            Condition → action rules in the workspace (rule engine input)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : (rules.data ?? []).length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No rules yet"
              description="No stored context rules in this workspace."
            />
          ) : (
            <ul className="space-y-2">
              {(rules.data ?? []).map((rule) => (
                <li key={rule.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                  <ToggleLeft
                    className={`mt-0.5 size-4 shrink-0 ${rule.isEnabled ? 'text-emerald-500' : 'text-muted-foreground'}`}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{rule.name}</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-normal ${STATUS_TONE[rule.status] ?? ''}`}
                      >
                        {rule.status}
                      </Badge>
                      {rule.isEnabled && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          enabled
                        </Badge>
                      )}
                    </div>
                    {rule.description !== null && (
                      <p className="text-muted-foreground text-xs">{rule.description}</p>
                    )}
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    priority {rule.priority}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Horizontal funnel: every stage count in execution order with removal deltas. */
function RunFunnel({ result }: { result: RuleRunResponse }) {
  const { countsAfterStage, initialCount, finalCount, totalDurationMs, removedByReason } =
    result.metrics

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary">{initialCount} input nodes</Badge>
        <Badge variant="secondary">{finalCount} survived</Badge>
        <Badge variant="secondary">{(totalDurationMs ?? 0).toFixed(2)} ms</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="border-border bg-card rounded-md border px-2 py-1 font-mono text-xs font-semibold">
          {initialCount}
        </span>
        {countsAfterStage.map((stage, index) => {
          const previous = index === 0 ? initialCount : (countsAfterStage[index - 1]?.count ?? 0)
          const removed = previous - stage.count
          const meta = STAGE_META[stage.stageId]
          return (
            <React.Fragment key={stage.stageId}>
              <span className="text-muted-foreground">→</span>
              <span
                className={`rounded-md border px-2 py-1 text-xs ${removed > 0 ? 'border-rose-500/30 bg-rose-500/5' : 'border-border bg-card'}`}
              >
                <span className="font-medium">{meta?.name ?? stage.stageId}</span>
                <span className="ml-1.5 font-mono font-semibold">{stage.count}</span>
                {removed > 0 && (
                  <span className="ml-1.5 font-mono text-[10px] text-rose-500">−{removed}</span>
                )}
              </span>
            </React.Fragment>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Object.entries(removedByReason)
          .filter(([, count]) => count > 0)
          .map(([reason, count]) => (
            <Badge key={reason} variant="outline" className="gap-1 text-[10px] font-normal">
              <CircleAlert className="size-2.5 text-rose-500" />
              <span className="font-mono">{reason}</span>
              <span className="text-muted-foreground">×{count}</span>
            </Badge>
          ))}
      </div>
    </div>
  )
}

/** The final candidate set — nodes that survived every rule. */
function Survivors({ result }: { result: RuleRunResponse }) {
  if (result.candidates.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No candidates survived"
        description="Every node in the set was removed by the rule pipeline — expand the rows below to see which rule stopped each one."
      />
    )
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Final candidate set</h3>
      <div className="flex flex-wrap gap-2">
        {result.candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="border-border bg-card flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
          >
            <Badge variant="outline" className="text-[9px] font-semibold">
              {candidate.type}
            </Badge>
            <span className="font-medium">{candidate.title}</span>
            <span className="text-muted-foreground font-mono text-[10px]">
              imp {candidate.importance}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
