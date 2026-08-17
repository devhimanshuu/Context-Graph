'use client'

import * as React from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  CircleAlert,
  GitBranch,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useApiQuery } from '@/hooks/use-api-query'
import { COMPLIANCE_TAG_DESCRIPTIONS } from '@/constants/domain'
import type { GraphEdge, KnowledgeNode, RuleRunResponse, RuleRunVerdict } from '@/lib/api/types'

const TYPE_TONE: Record<string, string> = {
  FACT: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  CONSTRAINT: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  DECISION: 'border-violet-500/40 text-violet-600 dark:text-violet-400',
  ANTI_PATTERN: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
}

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  DRAFT: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  SUPERSEDED: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  EXPIRED: 'border-zinc-500/40 text-zinc-500 dark:text-zinc-400',
  LEGAL_HOLD: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
  REVIEW_REQUIRED: 'border-orange-500/40 text-orange-600 dark:text-orange-400',
  ARCHIVED: '',
}

const RELATIONSHIP_TONE: Record<string, string> = {
  SUPPORTS: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  REQUIRES: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  DERIVED_FROM: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  SUPERSEDES: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  CONTRADICTS: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

const RULE_TONE: Record<string, string> = {
  'global-injection': 'border-violet-500/40 text-violet-600 dark:text-violet-400',
  isolation: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  compliance: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  permission: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  temporal: 'border-orange-500/40 text-orange-600 dark:text-orange-400',
  derivability: 'border-zinc-500/40 text-zinc-500 dark:text-zinc-400',
}

const RULE_LABEL: Record<string, string> = {
  'global-injection': 'Global injection',
  isolation: 'Organization isolation',
  compliance: 'Compliance clearance',
  permission: 'Permission',
  temporal: 'Temporal validity',
  derivability: 'Derivability',
}

interface KnowledgeNodeDetailProps {
  /** The node to inspect (sheet is open while non-null). */
  node: KnowledgeNode | null
  workspaceId: string | null
  /** Department display name for the node's departmentId. */
  departmentName?: string | null
  /** id → title lookup for graph edge endpoints. */
  titleById: ReadonlyMap<string, string>
  /** All workspace edges; the panel filters the ones touching this node. */
  edges: readonly GraphEdge[]
  onOpenChange: (open: boolean) => void
}

/** Right-side detail inspector for a knowledge node: full content, validity
 *  window, live rule-evaluation summary, and the graph edges touching it. */
export function KnowledgeNodeDetail({
  node,
  workspaceId,
  departmentName,
  titleById,
  edges,
  onOpenChange,
}: KnowledgeNodeDetailProps) {
  const ruleRun = useApiQuery<RuleRunResponse | null>(
    ['rule-run-single', node?.id ?? 'none'],
    async (api) => {
      if (node === null || workspaceId === null) return null
      return api.ruleEngineRun(workspaceId, { nodeIds: [node.id] })
    },
  )

  const explanation = React.useMemo(() => {
    if (ruleRun.data === null || ruleRun.data === undefined) return undefined
    return ruleRun.data.explanations.find((entry) => entry.nodeId === node?.id)
  }, [ruleRun.data, node?.id])

  const touchingEdges = React.useMemo(
    () =>
      node === null
        ? []
        : edges.filter((edge) => edge.sourceId === node.id || edge.targetId === node.id),
    [edges, node],
  )

  return (
    <Sheet open={node !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        {node === null ? null : (
          <div className="flex h-full flex-col">
            <SheetHeader className="border-border border-b">
              <div className="flex items-start justify-between gap-3 pr-6">
                <div className="min-w-0 space-y-2">
                  <SheetTitle className="text-lg leading-snug">{node.title}</SheetTitle>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] font-semibold', TYPE_TONE[node.type] ?? '')}
                    >
                      {node.type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-medium',
                        STATUS_TONE[node.status] ?? 'text-muted-foreground',
                      )}
                    >
                      {node.status}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      v{node.version}
                    </Badge>
                  </div>
                </div>
              </div>
              <SheetDescription className="truncate font-mono text-[11px]">
                {node.id}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <DetailSection title="Content">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{node.content}</p>
              </DetailSection>

              <DetailSection title="Attributes">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <MetaRow label="Importance" value={`${node.importance}/100`} />
                  <MetaRow
                    label="Derivability"
                    value={`${node.derivabilityScore}/100`}
                    hint="lower = more organization-specific"
                  />
                  <MetaRow
                    label="Department"
                    value={departmentName ?? '—'}
                    hint={
                      departmentName === undefined ? (node.departmentId ?? undefined) : undefined
                    }
                  />
                  <MetaRow label="Updated" value={new Date(node.updatedAt).toLocaleString()} />
                </dl>
                {node.complianceTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {node.complianceTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        title={COMPLIANCE_TAG_DESCRIPTIONS[tag]}
                        className="font-mono text-[9px] font-normal"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </DetailSection>

              <DetailSection title="Validity window">
                <ValidityWindow validFrom={node.validFrom} validTo={node.validTo} />
              </DetailSection>

              <DetailSection
                title="Rule evaluation"
                trailing={
                  <span className="text-muted-foreground font-mono text-[10px]">
                    POST /rule-engine/run · single node
                  </span>
                }
              >
                <RuleEvaluation
                  loading={ruleRun.isPending}
                  error={ruleRun.isError ? (ruleRun.error?.message ?? 'Rule run failed') : null}
                  explanation={explanation}
                />
              </DetailSection>

              <DetailSection
                title="Graph edges"
                trailing={
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {touchingEdges.length} connection{touchingEdges.length === 1 ? '' : 's'}
                  </span>
                }
              >
                {touchingEdges.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    This node has no graph edges yet — it is not connected to any other node.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {touchingEdges.map((edge) => (
                      <EdgeRow key={edge.id} edge={edge} nodeId={node.id} titleById={titleById} />
                    ))}
                  </ul>
                )}
              </DetailSection>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailSection({
  title,
  trailing,
  children,
}: {
  title: string
  trailing?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          {title}
        </h3>
        {trailing}
      </div>
      {children}
    </section>
  )
}

function MetaRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-[10px] tracking-wide uppercase">{label}</dt>
      <dd className="truncate text-[13px] font-medium" title={hint ?? value}>
        {value}
      </dd>
    </div>
  )
}

/** Renders validFrom/validTo with a live state pill (UTC-explicit, compared at render time). */
function ValidityWindow({
  validFrom,
  validTo,
}: {
  validFrom: string | null
  validTo: string | null
}) {
  if (validFrom === null && validTo === null) {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <CalendarClock className="size-3.5" />
        No validity window — the node never expires.
      </p>
    )
  }
  const now = Date.now()
  const from = validFrom === null ? null : new Date(validFrom).getTime()
  const to = validTo === null ? null : new Date(validTo).getTime()
  const state =
    to !== null && now > to
      ? { label: 'Expired', className: 'border-zinc-500/40 text-zinc-500 dark:text-zinc-400' }
      : from !== null && now < from
        ? { label: 'Scheduled', className: 'border-sky-500/40 text-sky-600 dark:text-sky-400' }
        : {
            label: 'In effect',
            className: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
          }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <CalendarClock className="text-muted-foreground size-3.5" />
        <span className="text-muted-foreground text-xs">
          {validFrom === null
            ? 'Effective immediately'
            : `Valid from ${new Date(validFrom).toLocaleString()}`}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs">
          {validTo === null
            ? 'No expiry date'
            : `Valid until ${new Date(validTo).toLocaleString()}`}
        </span>
        <Badge variant="outline" className={cn('ml-auto text-[10px] font-medium', state.className)}>
          {state.label}
        </Badge>
      </div>
    </div>
  )
}

function RuleEvaluation({
  loading,
  error,
  explanation,
}: {
  loading: boolean
  error: string | null
  explanation:
    | { included: boolean; finalReasonCode: string | null; ruleResults?: RuleRunVerdict[] }
    | undefined
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }
  if (error !== null) {
    return (
      <p className="text-destructive flex items-center gap-1.5 text-xs">
        <CircleAlert className="size-3.5" />
        {error}
      </p>
    )
  }
  if (explanation === undefined) {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <GitBranch className="size-3.5" />
        No rule verdict recorded for this node — it may be outside the visible scope for the current
        demo user.
      </p>
    )
  }
  const verdicts = explanation.ruleResults ?? []
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {explanation.included ? (
          <Badge className="gap-1 bg-emerald-600">
            <Check className="size-3" /> INCLUDED
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <X className="size-3" /> EXCLUDED
          </Badge>
        )}
        {explanation.finalReasonCode !== null && (
          <span className="text-muted-foreground font-mono text-[10px]">
            {explanation.finalReasonCode}
          </span>
        )}
      </div>
      <ul className="space-y-1">
        {verdicts.map((verdict) => (
          <li key={verdict.ruleId} className="flex items-center gap-2 text-xs">
            {verdict.passed ? (
              <Check className="size-3.5 shrink-0 text-emerald-500" />
            ) : (
              <X className="size-3.5 shrink-0 text-rose-500" />
            )}
            <Badge
              variant="outline"
              className={cn('font-mono text-[9px]', RULE_TONE[verdict.ruleId] ?? '')}
            >
              {RULE_LABEL[verdict.ruleId] ?? verdict.ruleId}
            </Badge>
            <span className="text-muted-foreground truncate" title={verdict.reason}>
              {verdict.reason}
            </span>
            <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[9px]">
              {verdict.reasonCode}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EdgeRow({
  edge,
  nodeId,
  titleById,
}: {
  edge: GraphEdge
  nodeId: string
  titleById: ReadonlyMap<string, string>
}) {
  const outgoing = edge.sourceId === nodeId
  const otherId = outgoing ? edge.targetId : edge.sourceId
  const OtherIcon = outgoing ? ArrowUpRight : ArrowDownRight
  return (
    <li className="border-border bg-muted/30 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs">
      <OtherIcon
        className={cn('size-3.5 shrink-0', outgoing ? 'text-emerald-500' : 'text-sky-500')}
      />
      <span className="text-muted-foreground shrink-0 text-[10px]">{outgoing ? 'to' : 'from'}</span>
      <span className="min-w-0 flex-1 truncate font-medium" title={otherId}>
        {titleById.get(otherId) ?? otherId}
      </span>
      <Badge
        variant="outline"
        className={cn(
          'shrink-0 font-mono text-[9px] font-normal',
          RELATIONSHIP_TONE[edge.relationshipType] ?? '',
        )}
      >
        {edge.relationshipType}
      </Badge>
      <span className="text-muted-foreground shrink-0 font-mono text-[10px]">w={edge.weight}</span>
    </li>
  )
}
