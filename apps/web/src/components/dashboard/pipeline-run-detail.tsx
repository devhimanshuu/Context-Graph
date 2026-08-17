'use client'

import * as React from 'react'
import { Boxes, CircleAlert, Pause, Play, RotateCcw, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/dashboard/empty-state'
import { ContextPackageSummary } from '@/components/dashboard/context-package-summary'
import { RuleExplanationPanel } from '@/components/dashboard/rule-explanation-panel'
import { cn } from '@/lib/utils'
import type { ContextPackage, PipelineRunRecord, PipelineTraceEntry } from '@/lib/api/types'

/** Stagger per stage (ms) — the whole 10-stage trace replays in ~3s. */
export const STAGE_STEP_MS = 300

/** Inspects one immutable run: metadata, the persisted trace + package (completed
 *  runs) or the failing stage + sanitized error (failed runs). Shared by the
 *  pipeline run history expander and the /pipeline/[executionId] detail page. */
export function RunDetail({ run }: { run: PipelineRunRecord }) {
  const packageView = runRecordToPackage(run)
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-3">
        <MetadataItem label="Entry node" value={run.entryNodeId} mono />
        <MetadataItem label="Strategy" value={run.strategy} mono />
        <MetadataItem label="Depth" value={String(run.maxDepth)} mono />
        <MetadataItem label="Token budget" value={String(run.tokenBudget)} mono />
        <MetadataItem label="Max candidates" value={String(run.maxCandidates)} mono />
        <MetadataItem label="Tokens used" value={String(run.tokensUsed)} mono />
        <MetadataItem label="Evaluated at" value={new Date(run.evaluatedAt).toLocaleString()} />
        <MetadataItem label="Version" value={run.version} mono />
        <MetadataItem label="Request id" value={run.requestId} mono />
      </dl>

      {run.status === 'failed' || packageView === null ? (
        <>
          <div className="border-destructive/30 bg-destructive/5 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs">
            <CircleAlert className="text-destructive mt-0.5 size-3.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">
                Run failed at stage{' '}
                <span className="font-mono">{run.failedStageId ?? 'unknown'}</span>
              </p>
              <p className="text-muted-foreground font-mono">
                {run.error?.code ?? 'ERR_PIPELINE'}: {run.error?.message ?? 'No error recorded'}
              </p>
              <p className="text-muted-foreground">
                Failed runs never persist a partial package — nothing was published. Stages after
                the failure were never executed.
              </p>
            </div>
          </div>
          <TracePlayer
            trace={run.trace}
            failedStageId={run.failedStageId}
            failedError={run.error}
          />
        </>
      ) : (
        <>
          <ContextPackageSummary result={packageView} />
          <TracePlayer trace={packageView.summary.trace} />
          <RankedList result={packageView} />
          <RuleExplanationPanel
            nodes={[
              ...packageView.candidates.map((candidate) => ({
                id: candidate.candidateId,
                title: candidate.title,
                included: true,
              })),
              ...packageView.exclusions.map((exclusion) => ({
                id: exclusion.nodeId,
                title: exclusion.nodeId,
                included: false,
                excludedByBudget: exclusion.excludedByBudget,
              })),
            ]}
            explanations={packageView.exclusions.map((exclusion) => ({
              nodeId: exclusion.nodeId,
              included: false,
              finalReasonCode: exclusion.finalReasonCode,
              failingRuleId: exclusion.failingRuleId,
              ruleResults: exclusion.ruleResults ?? [],
            }))}
          />
        </>
      )}
    </div>
  )
}

export function MetadataItem({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-[10px] tracking-wide uppercase">{label}</dt>
      <dd className={cn('truncate font-medium', mono && 'font-mono text-[11px]')} title={value}>
        {value}
      </dd>
    </div>
  )
}

/** Rebuilds the package view model of a completed run from its immutable record
 *  (the persisted payloads are exact JSON round-trips of the live shapes). */
export function runRecordToPackage(run: PipelineRunRecord): ContextPackage | null {
  if (
    run.status !== 'completed' ||
    run.metrics === null ||
    run.candidates === null ||
    run.exclusions === null
  ) {
    return null
  }
  const { metrics } = run
  return {
    packageId: run.packageId ?? '',
    requestId: run.requestId,
    version: run.version,
    mode: run.mode,
    workspaceId: run.workspaceId,
    entryNodeId: run.entryNodeId,
    strategy: run.strategy === 'weighted' ? 'weighted' : 'bfs',
    evaluatedAt: run.evaluatedAt,
    generatedAt: run.createdAt,
    tokenBudget: run.tokenBudget,
    tokensUsed: run.tokensUsed,
    truncated: metrics.excludedByBudget > 0 || metrics.excludedByRank > 0,
    candidates: run.candidates,
    exclusions: run.exclusions,
    summary: {
      requestId: run.requestId,
      packageId: run.packageId ?? '',
      version: run.version,
      mode: run.mode,
      evaluatedAt: run.evaluatedAt,
      funnel: {
        reachable: metrics.reachableNodes,
        authorized: metrics.authorizedNodes,
        ruleCandidates: metrics.ruleCandidates,
        included: metrics.includedCandidates,
      },
      metrics,
      trace: run.trace,
    },
  }
}

/** The animated 10-stage timeline: stages rise in sequence, counts pop,
 *  funnel bars grow, and packets flow down the rail into the next stage.
 *  When inspecting a failed run, pass `failedStageId` (and the sanitized
 *  `failedError`) so the failing stage is highlighted and its error shown. */
export function TracePlayer({
  trace,
  failedStageId = null,
  failedError = null,
}: {
  trace: readonly PipelineTraceEntry[]
  failedStageId?: string | null
  failedError?: { code: string; message: string } | null
}) {
  const [replayTick, setReplayTick] = React.useState(0)
  const [paused, setPaused] = React.useState(false)

  const maxCount = Math.max(...trace.map((step) => step.outputCount ?? 0), 1)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 font-mono">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            live
          </Badge>
          <span className="text-muted-foreground text-xs">
            {trace.length} stages · ~{(trace.length * STAGE_STEP_MS) / 1000}s
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? 'Resume trace' : 'Pause trace'}
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReplayTick((value) => value + 1)}
            aria-label="Replay trace"
          >
            <RotateCcw className="size-3.5" />
            Replay
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'border-border bg-muted/30 rounded-lg border p-4',
          paused && 'cg-pipeline-paused',
        )}
      >
        <div key={replayTick}>
          {trace.map((step, index) => {
            const delay = index * STAGE_STEP_MS
            const pct = Math.max(4, ((step.outputCount ?? 0) / maxCount) * 100)
            const completed = step.status === 'completed'
            const failed = step.stageId === failedStageId
            return (
              <div key={step.stageId} className="relative flex gap-3 pb-5 last:pb-0">
                {/* Rail: dot + downward connector with a flowing packet. */}
                <div className="flex w-4 shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      'cg-pipeline-stage ring-background mt-1.5 size-2.5 shrink-0 rounded-full ring-2',
                      completed ? 'bg-emerald-500' : 'bg-rose-500',
                      failed && 'animate-pulse',
                    )}
                    style={{ animationDelay: `${delay}ms` }}
                  />
                  {index < trace.length - 1 && (
                    <span className="bg-border relative my-1 w-px flex-1 overflow-visible">
                      <span
                        className="cg-pipeline-flow bg-primary absolute top-0 -left-[2px] size-1.5 rounded-full shadow-[0_0_6px_rgba(var(--cg-glow),0.8)]"
                        style={{ animationDelay: `${delay + 120}ms` }}
                      />
                    </span>
                  )}
                </div>

                {/* Stage card: name + duration, funnel bar + count. */}
                <div
                  className={cn(
                    'cg-pipeline-stage border-border bg-card min-w-0 flex-1 rounded-lg border px-3 py-2.5',
                    !completed && 'border-rose-500/40',
                    failed && 'border-rose-500/60 ring-2 ring-rose-500/15',
                  )}
                  style={{ animationDelay: `${delay}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{step.stageName}</span>
                    {failed && (
                      <Badge
                        variant="destructive"
                        className="shrink-0 gap-1 px-1.5 py-0 text-[9px] font-semibold"
                      >
                        <CircleAlert className="size-2.5" />
                        failed
                      </Badge>
                    )}
                    <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[10px]">
                      {step.durationMs.toFixed(1)} ms
                    </span>
                  </div>
                  {failed && failedError !== null && (
                    <p className="text-destructive mt-1.5 truncate font-mono text-[10px]">
                      {failedError.code}: {failedError.message}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="bg-muted h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
                      <div
                        className={cn(
                          'cg-pipeline-bar h-full rounded-full',
                          completed ? 'bg-primary/70' : 'bg-rose-500/70',
                        )}
                        style={{ width: `${pct}%`, animationDelay: `${delay + 120}ms` }}
                      />
                    </div>
                    <span
                      className="cg-pipeline-count min-w-7 text-right font-mono text-sm font-bold tabular-nums"
                      style={{ animationDelay: `${delay + 140}ms` }}
                    >
                      {failed ? (
                        <CircleAlert className="size-3.5 text-rose-500" />
                      ) : (
                        (step.outputCount ?? '–')
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-muted-foreground mt-3 text-[10px]">
          Bar width is proportional to the count (funnel shape); the packet marks the hand-off to
          the next stage. Reduced-motion users see the full trace statically.
        </p>
      </div>
    </div>
  )
}

export function RankedList({ result }: { result: ContextPackage }) {
  if (result.candidates.length === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title="No candidates survived"
        description="Every reachable node was removed by the rule pipeline, or the ranking/budget cut all of them. Check the explanations below."
      />
    )
  }
  return (
    <div className="space-y-2">
      {result.candidates.map((candidate) => (
        <div key={candidate.candidateId} className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded font-mono text-[9px] font-bold',
              candidate.rank === 1
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-muted text-muted-foreground',
            )}
          >
            #{candidate.rank}
          </span>
          <span className="text-muted-foreground font-mono text-[10px]">
            {candidate.score.toFixed(1)}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'gap-1 px-1.5 py-0 text-[9px] font-semibold',
              candidate.compressionHint === 'FULL' &&
                'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              candidate.compressionHint === 'SUMMARY' &&
                'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400',
              candidate.compressionHint === 'COMPRESSED' &&
                'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
              candidate.compressionHint === 'REFERENCE_ONLY' &&
                'border-zinc-500/40 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400',
            )}
          >
            <Sparkles className="size-2.5" />
            {candidate.compressionHint}
          </Badge>
          <span className="min-w-0 truncate text-sm">{candidate.title}</span>
          <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[10px]">
            ~{candidate.tokens} tokens
          </span>
        </div>
      ))}
    </div>
  )
}
