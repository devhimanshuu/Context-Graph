'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CircleAlert, CircleCheck, GitBranch, RotateCcw, Timer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/dashboard/page-header'
import { RunDetail } from '@/components/dashboard/pipeline-run-detail'
import { usePipelineRun } from '@/hooks/use-api-query'
import { ROUTES } from '@/constants'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

/** Deep-linkable view of one immutable pipeline run (`/dashboard/pipeline/[requestId]`).
 *  Fetches the run by requestId from the event store and renders the persisted
 *  trace, package and rule explanations — the same detail the history rows expand. */
export default function PipelineRunDetailPage() {
  const params = useParams<{ executionId: string }>()
  const executionId = params?.executionId ?? null

  const run = usePipelineRun(executionId)

  const notFound = run.isError && run.error instanceof ApiError && run.error.status === 404

  return (
    <div className="space-y-6">
      <PageHeader
        title={executionId !== null ? `Run ${executionId.slice(0, 8)}` : 'Run detail'}
        description={
          run.data !== undefined
            ? run.data.status === 'completed'
              ? `Completed ${new Date(run.data.evaluatedAt).toLocaleString()} — ${
                  run.data.metrics?.includedCandidates ?? 0
                } candidates in budget.`
              : `Failed at ${run.data.failedStageId ?? 'unknown'} — ${new Date(
                  run.data.evaluatedAt,
                ).toLocaleString()}.`
            : 'One immutable execution from the pipeline-run event store.'
        }
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={ROUTES.pipeline}>
            <ArrowLeft className="size-3.5" />
            Back to pipeline
          </Link>
        </Button>
      </PageHeader>

      {run.isPending ? (
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : notFound ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                <GitBranch className="text-muted-foreground size-5" />
              </div>
              <p className="text-sm font-medium">Run not found</p>
              <p className="text-muted-foreground max-w-sm text-xs">
                No execution with request id <span className="font-mono">{executionId ?? '—'}</span>{' '}
                exists in this organization&apos;s event store. It may have been created under a
                different workspace, or the link is stale.
              </p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link href={ROUTES.pipeline}>
                  <ArrowLeft className="size-3.5" />
                  Back to run history
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : run.isError ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="bg-destructive/10 flex size-10 items-center justify-center rounded-full">
                <CircleAlert className="text-destructive size-5" />
              </div>
              <p className="text-sm font-medium">Could not load this run</p>
              <p className="text-muted-foreground max-w-sm text-xs">
                {run.error instanceof ApiError
                  ? run.error.message
                  : run.error instanceof Error
                    ? run.error.message
                    : 'The API did not respond. Check that the backend is running.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => void run.refetch()}
              >
                <RotateCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : run.data !== undefined ? (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 py-3">
              <StatusBadge status={run.data.status} />
              <Badge variant="outline" className="gap-1 font-mono">
                <Timer className="size-3" />
                {(run.data.metrics?.totalDurationMs ?? 0).toFixed(1)} ms
              </Badge>
              <Badge variant="outline" className="font-mono">
                {run.data.mode} · {run.data.tokensUsed} tokens
              </Badge>
              <Badge variant="outline" className="font-mono">
                {run.data.version}
              </Badge>
              <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                {run.data.requestId}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <RunDetail run={run.data} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function StatusBadge({ status }: { status: 'completed' | 'failed' }) {
  const completed = status === 'completed'
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-mono text-[10px]',
        completed
          ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
          : 'border-rose-500/40 text-rose-600 dark:text-rose-400',
      )}
    >
      {completed ? <CircleCheck className="size-3" /> : <CircleAlert className="size-3" />}
      {status}
    </Badge>
  )
}
