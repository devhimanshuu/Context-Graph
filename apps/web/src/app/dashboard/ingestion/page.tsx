'use client'

import * as React from 'react'
import {
  Archive,
  CheckCircle2,
  FileText,
  LoaderCircle,
  RefreshCw,
  Search,
  Upload,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { useDocuments } from '@/hooks/use-api-query'
import { cn } from '@/lib/utils'
import type { DocumentRecord, DocumentChunk } from '@/lib/api/types'
import { StatCard, UploadDialog, DocumentDetailDialog, STATUS_ICON } from './ingestion-components'
import { STATUS_TONE, formatBytes } from './ingestion-constants'
import { type UploadFormState } from './ingestion-constants'

export default function IngestionPage() {
  const { client, bootstrap } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null

  const documents = useDocuments(workspaceId)
  const documentList = React.useMemo(() => documents.data ?? [], [documents.data])

  const [query, setQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('')

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

  const [selectedDocument, setSelectedDocument] = React.useState<DocumentRecord | null>(null)
  const [detailTab, setDetailTab] = React.useState<'overview' | 'chunks' | 'timeline'>('overview')
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
      toast.success(`Reprocessing "${doc.filename}"…`)
      void documents.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reprocess failed')
    }
  }

  const [archivingDoc, setArchivingDoc] = React.useState<DocumentRecord | null>(null)
  const [deletingDoc, setDeletingDoc] = React.useState<DocumentRecord | null>(null)

  const handleArchive = async () => {
    if (client === null || archivingDoc === null) return
    try {
      await client.archiveDocument(archivingDoc.id)
      toast.success(`Archived "${archivingDoc.filename}"`)
      setArchivingDoc(null)
      void documents.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Archive failed')
    }
  }

  const handleDelete = async () => {
    if (client === null || deletingDoc === null) return
    try {
      await client.deleteDocument(deletingDoc.id)
      toast.success(`Deleted "${deletingDoc.filename}"`)
      setDeletingDoc(null)
      void documents.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
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
            <TableSkeleton rows={5} columns={7} />
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
                            onClick={() => setArchivingDoc(doc)}
                            title="Archive"
                            aria-label={`Archive ${doc.filename}`}
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
          onArchive={() => setArchivingDoc(selectedDocument)}
          onDelete={() => setDeletingDoc(selectedDocument)}
          selectedChunk={selectedChunk}
          onSelectChunk={setSelectedChunk}
        />
      )}

      <ConfirmDialog
        open={archivingDoc !== null}
        onOpenChange={(open) => {
          if (!open) setArchivingDoc(null)
        }}
        title="Archive document"
        description={`Archive "${archivingDoc?.filename ?? ''}"? The document will no longer be searchable.`}
        confirmLabel="Archive"
        onConfirm={() => void handleArchive()}
      />

      <ConfirmDialog
        open={deletingDoc !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingDoc(null)
        }}
        title="Delete document"
        description={`Delete "${deletingDoc?.filename ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
