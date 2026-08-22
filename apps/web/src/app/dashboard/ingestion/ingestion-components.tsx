'use client'

import * as React from 'react'
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  FileUp,
  Hash,
  Layers,
  LoaderCircle,
  RefreshCw,
  Trash2,
  Upload,
  XCircle,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDocumentChunks } from '@/hooks/use-api-query'
import { cn } from '@/lib/utils'
import type { DocumentRecord, DocumentChunk } from '@/lib/api/types'
import { type UploadFormState, formatBytes, getStageStatus } from './ingestion-constants'

export const STATUS_ICON: Record<string, React.ReactNode> = {
  UPLOADED: <FileUp className="size-3.5" />,
  VALIDATING: <LoaderCircle className="size-3.5 animate-spin" />,
  QUEUED: <Clock className="size-3.5" />,
  EXTRACTING: <LoaderCircle className="size-3.5 animate-spin" />,
  EXTRACTED: <CheckCircle2 className="size-3.5" />,
  NORMALIZING: <LoaderCircle className="size-3.5 animate-spin" />,
  NORMALIZED: <CheckCircle2 className="size-3.5" />,
  CHUNKING: <LoaderCircle className="size-3.5 animate-spin" />,
  CHUNKED: <CheckCircle2 className="size-3.5" />,
  INDEXING: <LoaderCircle className="size-3.5 animate-spin" />,
  INDEXED: <CheckCircle2 className="size-3.5" />,
  PROCESSING: <LoaderCircle className="size-3.5 animate-spin" />,
  READY: <CheckCircle2 className="size-3.5" />,
  FAILED: <XCircle className="size-3.5" />,
  ARCHIVED: <Archive className="size-3.5" />,
  STALE: <AlertTriangle className="size-3.5" />,
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: number
  icon: React.ElementType
  tone?: 'default' | 'emerald' | 'amber' | 'rose'
}) {
  const toneClass = {
    default: 'text-foreground',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
  }[tone]

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="bg-muted flex size-9 items-center justify-center rounded-lg">
          <Icon className={cn('size-4', toneClass)} />
        </div>
        <div>
          <p className={cn('text-xl font-semibold', toneClass)}>{value}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Upload Dialog
// ---------------------------------------------------------------------------

export function UploadDialog({
  open,
  onOpenChange,
  form,
  setForm,
  uploading,
  error,
  onUpload,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: UploadFormState
  setForm: React.Dispatch<React.SetStateAction<UploadFormState>>
  uploading: boolean
  error: string | null
  onUpload: () => void
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setForm((prev) => ({
        ...prev,
        file,
        filename: file.name,
      }))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      setForm((prev) => ({
        ...prev,
        file,
        filename: file.name,
      }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            Upload a document to ingest into the knowledge graph. Supported formats: PDF, DOCX, TXT,
            Markdown, HTML, JSON.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
              form.file !== null
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-border hover:border-muted-foreground/40 cursor-pointer',
            )}
          >
            {form.file !== null ? (
              <>
                <FileText className="size-8 text-emerald-600" />
                <p className="text-sm font-medium">{form.file.name}</p>
                <p className="text-muted-foreground text-xs">{formatBytes(form.file.size)}</p>
              </>
            ) : (
              <>
                <Upload className="text-muted-foreground size-8" />
                <p className="text-sm font-medium">Drop a file here or click to browse</p>
                <p className="text-muted-foreground text-xs">
                  PDF, DOCX, TXT, Markdown, HTML, JSON — up to 50MB
                </p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md,.markdown,.html,.htm,.json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Filename override */}
          <label className="space-y-1.5">
            <span className="text-muted-foreground block text-xs font-medium">Filename</span>
            <input
              value={form.filename}
              onChange={(e) => setForm((prev) => ({ ...prev, filename: e.target.value }))}
              placeholder="Document filename"
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
            />
          </label>

          {/* Visibility */}
          <label className="space-y-1.5">
            <span className="text-muted-foreground block text-xs font-medium">Visibility</span>
            <select
              value={form.visibility}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  visibility: e.target.value as UploadFormState['visibility'],
                }))
              }
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
            >
              <option value="PRIVATE">Private</option>
              <option value="ORGANIZATION">Organization</option>
              <option value="PUBLIC">Public</option>
            </select>
          </label>

          {error !== null && (
            <p className="text-destructive flex items-center gap-1.5 text-xs">
              <AlertTriangle className="size-3.5" />
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onUpload} disabled={uploading || form.file === null}>
            {uploading ? <LoaderCircle className="animate-spin" /> : <Upload className="size-4" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Document Detail Dialog
// ---------------------------------------------------------------------------

export function DocumentDetailDialog({
  document: doc,
  tab,
  setTab,
  onOpenChange,
  onReprocess,
  onArchive,
  onDelete,
  selectedChunk,
  onSelectChunk,
}: {
  document: DocumentRecord
  tab: 'overview' | 'chunks' | 'timeline'
  setTab: (tab: 'overview' | 'chunks' | 'timeline') => void
  onOpenChange: (open: boolean) => void
  onReprocess: () => void
  onArchive: () => void
  onDelete: () => void
  selectedChunk: DocumentChunk | null
  onSelectChunk: (chunk: DocumentChunk | null) => void
}) {
  const chunks = useDocumentChunks(doc.id)
  const chunkList = React.useMemo(() => chunks.data ?? [], [chunks.data])

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            {doc.title}
          </DialogTitle>
          <DialogDescription>{doc.filename}</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {(['overview', 'chunks', 'timeline'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-2 text-xs font-medium capitalize transition-colors',
                tab === t
                  ? 'text-foreground border-foreground border-b-2'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[300px]">
          {tab === 'overview' && <OverviewTab document={doc} />}
          {tab === 'chunks' && (
            <ChunksTab
              chunks={chunkList}
              loading={chunks.isPending}
              selectedChunk={selectedChunk}
              onSelectChunk={onSelectChunk}
            />
          )}
          {tab === 'timeline' && <TimelineTab document={doc} />}
        </div>

        {/* Actions */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {doc.status === 'FAILED' || doc.status === 'STALE' ? (
            <Button variant="outline" onClick={onReprocess}>
              <RefreshCw className="size-3.5" />
              Reprocess
            </Button>
          ) : null}
          <Button variant="outline" onClick={onArchive}>
            <Archive className="size-3.5" />
            Archive
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

export function OverviewTab({ document: doc }: { document: DocumentRecord }) {
  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <InfoField label="Status" value={doc.status} />
        <InfoField label="Version" value={`v${doc.version}`} />
        <InfoField label="Content Type" value={doc.contentType} />
        <InfoField label="Size" value={formatBytes(doc.size)} />
        <InfoField label="Source Type" value={doc.sourceType} />
        <InfoField label="Visibility" value={doc.visibility} />
        <InfoField label="Checksum" value={doc.checksum.slice(0, 16) + '…'} />
        <InfoField label="Created" value={new Date(doc.createdAt).toLocaleString()} />
      </div>

      {doc.processingMetadata && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Processing</h4>
          <div className="grid grid-cols-2 gap-4">
            {doc.processingMetadata.totalDurationMs !== undefined && (
              <InfoField
                label="Total Duration"
                value={`${doc.processingMetadata.totalDurationMs}ms`}
              />
            )}
            {doc.processingMetadata.chunkCount !== undefined && (
              <InfoField label="Chunks" value={String(doc.processingMetadata.chunkCount)} />
            )}
            {doc.processingMetadata.nodeCount !== undefined && (
              <InfoField label="Nodes Created" value={String(doc.processingMetadata.nodeCount)} />
            )}
            {doc.processingMetadata.extractionDurationMs !== undefined && (
              <InfoField
                label="Extraction"
                value={`${doc.processingMetadata.extractionDurationMs}ms`}
              />
            )}
            {doc.processingMetadata.normalizationDurationMs !== undefined && (
              <InfoField
                label="Normalization"
                value={`${doc.processingMetadata.normalizationDurationMs}ms`}
              />
            )}
            {doc.processingMetadata.chunkingDurationMs !== undefined && (
              <InfoField
                label="Chunking"
                value={`${doc.processingMetadata.chunkingDurationMs}ms`}
              />
            )}
          </div>
        </div>
      )}

      {doc.tags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Tags</h4>
          <div className="flex flex-wrap gap-1">
            {doc.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {doc.processingMetadata?.error && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-rose-600">Error</h4>
          <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-xs">
            {doc.processingMetadata.error}
          </pre>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chunks Tab
// ---------------------------------------------------------------------------

export function ChunksTab({
  chunks,
  loading,
  selectedChunk,
  onSelectChunk,
}: {
  chunks: DocumentChunk[]
  loading: boolean
  selectedChunk: DocumentChunk | null
  onSelectChunk: (chunk: DocumentChunk | null) => void
}) {
  const [expandedChunkId, setExpandedChunkId] = React.useState<string | null>(null)

  if (loading) {
    return <Skeleton className="h-48 w-full" />
  }

  if (chunks.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No chunks"
        description="This document has not been chunked yet."
      />
    )
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {chunks.length} chunk{chunks.length !== 1 ? 's' : ''} extracted
        </p>
      </div>

      <div className="space-y-2">
        {chunks.map((chunk) => (
          <div
            key={chunk.chunkId}
            className={cn(
              'rounded-lg border p-3 transition-colors',
              selectedChunk?.chunkId === chunk.chunkId
                ? 'border-indigo-500/40 bg-indigo-500/5'
                : 'border-border hover:bg-muted/40',
            )}
          >
            <div
              className="flex cursor-pointer items-start justify-between"
              onClick={() => {
                setExpandedChunkId(expandedChunkId === chunk.chunkId ? null : chunk.chunkId)
                onSelectChunk(selectedChunk?.chunkId === chunk.chunkId ? null : chunk)
              }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    #{chunk.chunkIndex + 1}
                  </Badge>
                  {chunk.section && (
                    <Badge variant="secondary" className="text-[10px]">
                      {chunk.section}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                  {chunk.content.slice(0, 200)}
                  {chunk.content.length > 200 ? '…' : ''}
                </p>
              </div>
              {expandedChunkId === chunk.chunkId ? (
                <ChevronDown className="text-muted-foreground size-4" />
              ) : (
                <ChevronRight className="text-muted-foreground size-4" />
              )}
            </div>

            {expandedChunkId === chunk.chunkId && (
              <div className="mt-3 space-y-2 border-t pt-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Offset: {chunk.startOffset}–{chunk.endOffset}
                  </span>
                  <span className="text-muted-foreground">
                    Hash: {chunk.contentHash.slice(0, 12)}…
                  </span>
                </div>
                <pre className="bg-muted max-h-48 overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap">
                  {chunk.content}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    void navigator.clipboard.writeText(chunk.content)
                  }}
                >
                  <Copy className="size-3" />
                  Copy content
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timeline Tab
// ---------------------------------------------------------------------------

export function TimelineTab({ document: doc }: { document: DocumentRecord }) {
  const pm = doc.processingMetadata

  const stages = React.useMemo(() => {
    const items: Array<{
      id: string
      label: string
      status: 'completed' | 'failed' | 'pending'
      durationMs?: number
      icon: React.ElementType
    }> = [
      {
        id: 'UPLOADED',
        label: 'Uploaded',
        status: 'completed',
        icon: FileUp,
      },
      {
        id: 'EXTRACTING',
        label: 'Content Extraction',
        status: getStageStatus('EXTRACTING', doc.status),
        durationMs: pm?.extractionDurationMs,
        icon: FileText,
      },
      {
        id: 'NORMALIZING',
        label: 'Normalization',
        status: getStageStatus('NORMALIZING', doc.status),
        durationMs: pm?.normalizationDurationMs,
        icon: Zap,
      },
      {
        id: 'CHUNKING',
        label: 'Chunking',
        status: getStageStatus('CHUNKING', doc.status),
        durationMs: pm?.chunkingDurationMs,
        icon: Layers,
      },
      {
        id: 'INDEXING',
        label: 'Vector Indexing',
        status: getStageStatus('INDEXING', doc.status),
        durationMs: pm?.embeddingDurationMs,
        icon: Hash,
      },
      {
        id: 'READY',
        label: 'Published',
        status:
          doc.status === 'READY' ? 'completed' : doc.status === 'FAILED' ? 'failed' : 'pending',
        icon: CheckCircle2,
      },
    ]

    if (doc.status === 'FAILED' && pm?.error) {
      items.push({
        id: 'ERROR',
        label: 'Error',
        status: 'failed',
        icon: XCircle,
      })
    }

    return items
  }, [doc, pm])

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Processing Timeline</p>
        {pm?.totalDurationMs !== undefined && (
          <Badge variant="secondary" className="font-mono text-[10px]">
            Total: {pm.totalDurationMs}ms
          </Badge>
        )}
      </div>

      <div className="relative space-y-0">
        {stages.map((stage, index) => {
          const Icon = stage.icon
          const isLast = index === stages.length - 1

          return (
            <div key={stage.id} className="relative flex gap-3">
              {!isLast && <div className="bg-border absolute top-8 left-3.5 h-full w-px" />}

              <div
                className={cn(
                  'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border',
                  stage.status === 'completed'
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : stage.status === 'failed'
                      ? 'border-rose-500/40 bg-rose-500/10'
                      : 'border-border bg-muted',
                )}
              >
                <Icon
                  className={cn(
                    'size-3.5',
                    stage.status === 'completed'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : stage.status === 'failed'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-muted-foreground',
                  )}
                />
              </div>

              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{stage.label}</p>
                  {stage.status === 'completed' && (
                    <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  {stage.status === 'failed' && (
                    <XCircle className="size-3.5 text-rose-600 dark:text-rose-400" />
                  )}
                  {stage.durationMs !== undefined && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {stage.durationMs}ms
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {pm?.warnings && pm.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Warnings</h4>
          <div className="space-y-1">
            {pm.warnings.map((warning, index) => (
              <div
                key={index}
                className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2"
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                <p className="text-xs">{warning}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
