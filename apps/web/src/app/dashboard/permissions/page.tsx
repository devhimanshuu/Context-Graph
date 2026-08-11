'use client'

import * as React from 'react'
import { LoaderCircle, ShieldCheck, ShieldX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { useApiData } from '@/hooks/use-api-data'
import type { AuthorizationDecision } from '@/lib/api/types'

const CLEARANCE_TONE: Record<string, string> = {
  NONE: '',
  STANDARD: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  SENSITIVE: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  RESTRICTED: 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400',
  CRITICAL: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

export default function PermissionsPage() {
  const { client, bootstrap, context, selectedUser } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null

  const nodes = useApiData(
    async (api) => (workspaceId === null ? [] : api.knowledgeNodes(workspaceId)),
    [workspaceId],
  )

  const [selectedNodeId, setSelectedNodeId] = React.useState<string>('')
  const [decision, setDecision] = React.useState<AuthorizationDecision | null>(null)
  const [evaluating, setEvaluating] = React.useState(false)
  const [evaluateError, setEvaluateError] = React.useState<string | null>(null)

  const nodeList = React.useMemo(() => nodes.data ?? [], [nodes.data])
  React.useEffect(() => {
    if (selectedNodeId === '' && nodeList.length > 0) {
      setSelectedNodeId(nodeList[0]?.id ?? '')
    }
  }, [nodeList, selectedNodeId])

  const runEvaluation = React.useCallback(async () => {
    if (client === null || selectedNodeId === '') return
    const node = nodeList.find((candidate) => candidate.id === selectedNodeId)
    if (node === undefined) return
    setEvaluating(true)
    setEvaluateError(null)
    try {
      setDecision(
        await client.evaluateResource({
          id: node.id,
          resourceType: 'knowledge-node',
          workspaceId: node.workspaceId,
          departmentId: node.departmentId,
          complianceTags: node.complianceTags,
          visibility: 'INTERNAL',
          status: node.status,
          attributes: { type: node.type },
        }),
      )
    } catch (error) {
      setEvaluateError(error instanceof Error ? error.message : 'Evaluation failed')
      setDecision(null)
    } finally {
      setEvaluating(false)
    }
  }, [client, selectedNodeId, nodeList])

  const selectedNode = nodeList.find((node) => node.id === selectedNodeId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions"
        description="Your compiled authorization context and a live evaluation playground — powered by the Phase 5 authorization engine."
      >
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="size-3" />
          Authorization Engine · Phase 5
        </Badge>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My compiled context</CardTitle>
            <CardDescription>
              Server-derived — switching the demo user in the top bar recompiles it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {context === null ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <ContextCell label="Role" value={context.role} />
                  <ContextCell label="Permission level" value={context.permissionLevel} />
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs font-medium">
                      Compliance clearance
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium ${CLEARANCE_TONE[context.complianceClearance] ?? ''}`}
                    >
                      {context.complianceClearance}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs font-medium">Acting as</p>
                    <p className="text-sm font-medium">{selectedUser?.name ?? context.userId}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs font-medium">
                    Effective compliance tags ({context.effectiveComplianceTags.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {context.effectiveComplianceTags.length === 0 ? (
                      <span className="text-muted-foreground text-xs">None</span>
                    ) : (
                      context.effectiveComplianceTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] font-normal">
                          {tag}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs font-medium">
                    Accessible departments ({context.accessibleDepartmentIds.length})
                  </p>
                  <ul className="text-muted-foreground max-h-28 list-inside list-disc space-y-0.5 overflow-y-auto text-xs">
                    {context.accessibleDepartmentIds.map((departmentId) => (
                      <li key={departmentId} className="truncate font-mono">
                        {departmentId}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evaluate a node</CardTitle>
            <CardDescription>
              Run the full policy pipeline (organization → department → role → level → compliance →
              visibility).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {nodes.loading ? (
              <Skeleton className="h-8 w-full" />
            ) : nodeList.length === 0 ? (
              <p className="text-muted-foreground bg-muted/40 rounded-lg p-2.5 text-xs">
                No nodes are visible in this workspace for your authorization scope — switch the
                demo user in the top bar to evaluate different access levels.
              </p>
            ) : (
              <select
                value={selectedNodeId}
                onChange={(event) => setSelectedNodeId(event.target.value)}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none"
              >
                {nodeList.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.title} — {node.complianceTags.join(', ') || 'no tags'}
                  </option>
                ))}
              </select>
            )}

            <Button
              className="w-full"
              onClick={() => void runEvaluation()}
              disabled={evaluating || selectedNodeId === ''}
            >
              {evaluating ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Evaluate READ
            </Button>

            {evaluateError !== null && <p className="text-destructive text-xs">{evaluateError}</p>}

            {decision === null ? (
              <EmptyState
                icon={ShieldX}
                title="No decision yet"
                description="Pick a node and evaluate — the decision shows every policy verdict, so you can see exactly why a node is allowed or denied."
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {decision.allowed ? (
                    <Badge className="gap-1 bg-emerald-600">
                      <ShieldCheck className="size-3" /> ALLOWED
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <ShieldX className="size-3" /> DENIED
                    </Badge>
                  )}
                  <span className="text-muted-foreground text-xs">{decision.reason}</span>
                </div>

                {!decision.allowed && decision.failedPolicy !== null && (
                  <p className="text-xs">
                    Failing policy:{' '}
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {decision.failedPolicy}
                    </Badge>
                  </p>
                )}

                <ul className="space-y-1">
                  {(decision.verdicts ?? []).map((verdict) => (
                    <li key={verdict.policy} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-36 font-mono">{verdict.policy}</span>
                      <Badge
                        variant="outline"
                        className={
                          verdict.outcome === 'ALLOW'
                            ? 'border-emerald-500/40 text-[10px] text-emerald-600 dark:text-emerald-400'
                            : verdict.outcome === 'DENY'
                              ? 'border-rose-500/40 text-[10px] text-rose-600 dark:text-rose-400'
                              : 'text-muted-foreground text-[10px]'
                        }
                      >
                        {verdict.outcome}
                      </Badge>
                      {verdict.reason !== undefined && (
                        <span className="text-muted-foreground truncate">{verdict.reason}</span>
                      )}
                    </li>
                  ))}
                </ul>

                {selectedNode !== undefined && (
                  <p className="text-muted-foreground border-t pt-2 text-xs">
                    Target: <span className="font-medium">{selectedNode.title}</span>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ContextCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}
