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
  Search,
  Trash2,
  Upload,
  XCircle,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { useDocuments, useDocumentChunks } from '@/hooks/use-api-query'
import { cn } from '@/lib/utils'
import type { DocumentRecord, DocumentChunk, DocumentStatus } from '@/lib/api/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TONE: Record<DocumentStatus, string> = {
  UPLOADED: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  VALIDATING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  QUEUED: 'border-zinc-500/40 text-zinc-500 dark:text-zinc-400',
  EXTRACTING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  EXTRACTED: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  NORMALIZING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  NORMALIZED: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  CHUNKING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  CHUNKED: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  INDEXING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  INDEXED: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  PROCESSING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  READY: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  FAILED: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
  ARCHIVED: 'border-zinc-500/40 text-zinc-500 dark:text-zinc-400',
  STALE: 'border-orange-500/40 text-orange-600 dark:text-orange-400',
}

const STATUS_ICON: Record<DocumentStatus, React.ReactNode> = {
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
// Types
// ---------------------------------------------------------------------------

interface UploadFormState {
  file: File | null
  filename: string
  workspaceId: string
  departmentId: string
  tags: string[]
  visibility: 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC'
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function IngestionPage() {
  const { client, bootstrap } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null

  const documents = useDocuments(workspaceId)
  const documentList = React.useMemo(() => documents.data ?? [], [documents.data])

  // -- Filters --
  const [query, setQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('')

  // -- Upload dialog --
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [uploadForm, setUploadForm] = React.useState<UploadFormState>({
    file: null,
    filename: '',
    workspaceId: workspaceId ?? '',
    departmentId: '',
    tags: [],
    visibility: 'ORGANIZATION',
  })
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  // -- Document detail dialog --
  const [selectedDocument, setSelectedDocument] = React.useState<DocumentRecord | null>(null)
  const [detailTab, setDetailTab] = React.useState<'overview' | 'chunks' | 'timeline'>('overview')

  // -- Chunk explorer --
  const [selectedChunk, setSelectedChunk] = React.useState<DocumentChunk | null>(null)

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return documentList.filter((doc) => {
      if (statusFilter !== '' && doc.status !== statusFilter) return false
      if (needle !== '') {
        const haystack = `${doc.title} ${doc.filename}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })
  }, [documentList, query, statusFilter])

  const stats = React.useMemo(() => {
    const total = documentList.length
    const ready = documentList.filter((d) => d.status === 'READY').length
    const processing = documentList.filter(
      (d) => !['READY', 'FAILED', 'ARCHIVED'].includes(d.status),
    ).length
    const failed = documentList.filter((d) => d.status === 'FAILED').length
    return { total, ready, processing, failed }
  }, [documentList])

  const handleUpload = async () => {
    if (client === null || uploadForm.file === null || workspaceId === null) return

    setUploading(true)
    setUploadError(null)

    try {
      const arrayBuffer = await uploadForm.file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
      )

      await client.uploadDocument({
        filename: uploadForm.filename || uploadForm.file.name,
        content: base64,
        contentType: uploadForm.file.type || 'application/octet-stream',
        workspaceId,
        departmentId: uploadForm.departmentId || undefined,
        tags: uploadForm.tags.length > 0 ? uploadForm.tags : undefined,
        visibility: uploadForm.visibility,
      })

      setUploadOpen(false)
      setUploadForm({
        file: null,
        filename: '',
        workspaceId: workspaceId ?? '',
        departmentId: '',
        tags: [],
        visibility: 'ORGANIZATION',
      })
      void documents.refetch()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleReprocess = async (doc: DocumentRecord) => {
    if (client === null) return
    try {
      await client.reprocessDocument(doc.id)
      void documents.refetch()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Reprocess failed')
    }
  }

  const handleArchive = async (doc: DocumentRecord) => {
    if (client === null) return
    if (!window.confirm(`Archive "${doc.filename}"?`)) return
    try {
      await client.archiveDocument(doc.id)
      void documents.refetch()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Archive failed')
    }
  }

  const handleDelete = async (doc: DocumentRecord) => {
    if (client === null) return
    if (!window.confirm(`Delete "${doc.filename}"? This cannot be undone.`)) return
    try {
      await client.deleteDocument(doc.id)
      void documents.refetch()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingestion"
        description="Upload, process, and monitor document ingestion into the knowledge graph."
      >
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" />
          Upload document
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total documents" value={stats.total} icon={FileText} />
        <StatCard label="Ready" value={stats.ready} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Processing" value={stats.processing} icon={LoaderCircle} tone="amber" />
        <StatCard label="Failed" value={stats.failed} icon={XCircle} tone="rose" />
      </div>

      {/* Document list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="text-muted-foreground size-4" />
            Documents
            <Badge variant="secondary" className="ml-1 font-mono text-[10px]">
              {filtered.length} / {documentList.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Uploaded documents processed through the ingestion pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-52 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents…"
                aria-label="Search documents"
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border pl-8 text-sm outline-none focus-visible:ring-3"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border px-2 text-sm outline-none focus-visible:ring-3"
            >
              <option value="">All statuses</option>
              <option value="READY">Ready</option>
              <option value="PROCESSING">Processing</option>
              <option value="FAILED">Failed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Table */}
          {documents.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={documentList.length === 0 ? 'No documents' : 'No matches'}
              description={
                documentList.length === 0
                  ? 'Upload your first document to start building the knowledge graph.'
                  : 'Nothing matches the current filters.'
              }
            >
              {documentList.length === 0 && (
                <Button size="sm" onClick={() => setUploadOpen(true)}>
                  <Upload className="size-3.5" />
                  Upload document
                </Button>
              )}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="pr-4 pb-2 font-medium">Document</th>
                    <th className="pr-4 pb-2 font-medium">Status</th>
                    <th className="pr-4 pb-2 font-medium">Type</th>
                    <th className="pr-4 pb-2 font-medium">Size</th>
                    <th className="pr-4 pb-2 font-medium">Chunks</th>
                    <th className="pr-4 pb-2 font-medium">Uploaded</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => {
                        setSelectedDocument(doc)
                        setDetailTab('overview')
                      }}
                      className="hover:bg-muted/40 cursor-pointer border-b last:border-0"
                    >
                      <td className="max-w-64 py-2.5 pr-4">
                        <p className="truncate font-medium" title={doc.title}>
                          {doc.title}
                        </p>
                        <p className="text-muted-foreground truncate text-xs" title={doc.filename}>
                          {doc.filename}
                        </p>
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            'gap-1 text-[10px] font-medium',
                            STATUS_TONE[doc.status] ?? '',
                          )}
                        >
                          {STATUS_ICON[doc.status]}
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground py-2.5 pr-4 text-xs">
                        {doc.contentType.split('/').pop()?.toUpperCase() ?? '—'}
                      </td>
                      <td className="text-muted-foreground py-2.5 pr-4 text-xs">
                        {formatBytes(doc.size)}
                      </td>
                      <td className="text-muted-foreground py-2.5 pr-4 font-mono text-xs">
                        {doc.processingMetadata?.chunkCount ?? '—'}
                      </td>
                      <td className="text-muted-foreground py-2.5 pr-4 text-xs">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {doc.status === 'FAILED' || doc.status === 'STALE' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleReprocess(doc)}
                              title="Reprocess"
                            >
                              <RefreshCw className="size-3.5" />
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => void handleArchive(doc)}
                            title="Archive"
                          >
                            <Archive className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload dialog */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        form={uploadForm}
        setForm={setUploadForm}
        uploading={uploading}
        error={uploadError}
        onUpload={handleUpload}
      />

      {/* Document detail dialog */}
      {selectedDocument !== null && (
        <DocumentDetailDialog
          document={selectedDocument}
          tab={detailTab}
          setTab={setDetailTab}
          onOpenChange={(open) => {
            if (!open) setSelectedDocument(null)
          }}
          onReprocess={() => void handleReprocess(selectedDocument)}
          onArchive={() => void handleArchive(selectedDocument)}
          onDelete={() => void handleDelete(selectedDocument)}
          selectedChunk={selectedChunk}
          onSelectChunk={setSelectedChunk}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
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

function UploadDialog({
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

function DocumentDetailDialog({
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

function OverviewTab({ document: doc }: { document: DocumentRecord }) {
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

      {/* Processing metadata */}
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

      {/* Tags */}
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

      {/* Error */}
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

function ChunksTab({
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

function TimelineTab({ document: doc }: { document: DocumentRecord }) {
  const pm = doc.processingMetadata

  // Build timeline stages from processing metadata
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
        status: getStatus('EXTRACTING', doc.status),
        durationMs: pm?.extractionDurationMs,
        icon: FileText,
      },
      {
        id: 'NORMALIZING',
        label: 'Normalization',
        status: getStatus('NORMALIZING', doc.status),
        durationMs: pm?.normalizationDurationMs,
        icon: Zap,
      },
      {
        id: 'CHUNKING',
        label: 'Chunking',
        status: getStatus('CHUNKING', doc.status),
        durationMs: pm?.chunkingDurationMs,
        icon: Layers,
      },
      {
        id: 'INDEXING',
        label: 'Vector Indexing',
        status: getStatus('INDEXING', doc.status),
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
              {/* Vertical line */}
              {!isLast && <div className="bg-border absolute top-8 left-3.5 h-full w-px" />}

              {/* Icon */}
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

              {/* Content */}
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

      {/* Warnings */}
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getStatus(
  stage: string,
  currentStatus: DocumentStatus,
): 'completed' | 'failed' | 'pending' {
  const stageOrder = [
    'UPLOADED',
    'VALIDATING',
    'QUEUED',
    'EXTRACTING',
    'EXTRACTED',
    'NORMALIZING',
    'NORMALIZED',
    'CHUNKING',
    'CHUNKED',
    'INDEXING',
    'INDEXED',
    'PROCESSING',
    'READY',
  ]

  const currentIdx = stageOrder.indexOf(currentStatus)
  const stageIdx = stageOrder.indexOf(stage)

  if (currentStatus === 'FAILED') {
    return stageIdx <= currentIdx ? 'completed' : 'failed'
  }

  return stageIdx < currentIdx ? 'completed' : 'pending'
}
