'use client'

import * as React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, Library, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { KnowledgeNodeDetail } from '@/components/dashboard/knowledge-node-detail'
import { useDepartments, useGraphEdges, useKnowledgeNodes } from '@/hooks/use-api-query'
import { cn } from '@/lib/utils'
import { NODE_TYPE_COLORS, NODE_STATUS_COLORS } from '@/lib/tokens'
import type { ComplianceTag, KnowledgeNode } from '@/lib/api/types'
import {
  NODE_TYPES,
  NODE_STATUSES,
  COMPLIANCE_TAGS,
  type NodeFormState,
  EMPTY_FORM,
  FilterSelect,
  ImportanceCell,
  NodeEditorDialog,
} from './knowledge-components'

// Re-export for backward compat

/** The roles that may create/edit nodes (server enforces the real boundary via WRITE permission). */
const CAN_WRITE_ROLES = ['ADMIN', 'HOD', 'EDITOR'] as const
/** Soft-delete is restricted server-side to ADMIN/QUALITY. */
const CAN_DELETE_ROLES = ['ADMIN', 'QUALITY'] as const

function toForm(node: KnowledgeNode): NodeFormState {
  return {
    title: node.title,
    content: node.content,
    type: node.type,
    status: node.status,
    importance: node.importance,
    derivabilityScore: node.derivabilityScore,
    complianceTags: [...node.complianceTags],
    departmentId: node.departmentId ?? '',
    validFrom: node.validFrom === null ? '' : node.validFrom.slice(0, 16),
    validTo: node.validTo === null ? '' : node.validTo.slice(0, 16),
  }
}

function toPayload(form: NodeFormState) {
  return {
    title: form.title.trim(),
    content: form.content.trim(),
    type: form.type,
    status: form.status,
    importance: form.importance,
    derivabilityScore: form.derivabilityScore,
    complianceTags: form.complianceTags,
    departmentId: form.departmentId === '' ? null : form.departmentId,
    validFrom: form.validFrom === '' ? null : new Date(form.validFrom).toISOString(),
    validTo: form.validTo === '' ? null : new Date(form.validTo).toISOString(),
  }
}

export default function KnowledgePage() {
  const { client, bootstrap, selectedUser } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null
  const organizationId = bootstrap?.organizationId ?? null

  const nodes = useKnowledgeNodes(workspaceId)
  const departments = useDepartments(organizationId)
  const edges = useGraphEdges(workspaceId)

  // -- Filters synced to URL for shareability --
  const searchParams = useSearchParams()
  const router = useRouter()
  const createQueryString = React.useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === '') {
        params.delete(name)
      } else {
        params.set(name, value)
      }
      return params.toString()
    },
    [searchParams],
  )
  const query = searchParams.get('q') ?? ''
  const typeFilter = searchParams.get('type') ?? ''
  const statusFilter = searchParams.get('status') ?? ''
  const departmentFilter = searchParams.get('dept') ?? ''
  const tagFilter = searchParams.get('tag') ?? ''
  const showArchived = searchParams.get('archived') === '1'

  const setFilter = React.useCallback(
    (name: string, value: string) => {
      router.push(`?${createQueryString(name, value)}`, { scroll: false })
    },
    [router, createQueryString],
  )

  // -- Editor dialog (synced to URL hash for deep-linking) --
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const hash = window.location.hash.slice(1)
    return hash.length > 0 ? hash : null
  })

  // Sync selected node to URL hash
  React.useEffect(() => {
    if (selectedNodeId !== null) {
      window.history.replaceState(null, '', `#${selectedNodeId}`)
    } else {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [selectedNodeId])
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingNode, setEditingNode] = React.useState<KnowledgeNode | null>(null)
  const [form, setForm] = React.useState<NodeFormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [formErrors, setFormErrors] = React.useState<{ title?: string; content?: string }>({})

  const canWrite =
    selectedUser !== null && (CAN_WRITE_ROLES as readonly string[]).includes(selectedUser.role)
  const canDelete =
    selectedUser !== null && (CAN_DELETE_ROLES as readonly string[]).includes(selectedUser.role)

  const nodeList = React.useMemo(() => nodes.data ?? [], [nodes.data])
  const departmentList = React.useMemo(() => departments.data ?? [], [departments.data])
  const departmentNameById = React.useMemo(
    () => new Map(departmentList.map((department) => [department.id, department.name])),
    [departmentList],
  )
  const titleById = React.useMemo(
    () => new Map(nodeList.map((node) => [node.id, node.title])),
    [nodeList],
  )
  const selectedNode =
    selectedNodeId === null ? null : (nodeList.find((node) => node.id === selectedNodeId) ?? null)

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return nodeList.filter((node) => {
      if (!showArchived && node.status === 'ARCHIVED') return false
      if (typeFilter !== '' && node.type !== typeFilter) return false
      if (statusFilter !== '' && node.status !== statusFilter) return false
      if (departmentFilter !== '' && node.departmentId !== departmentFilter) return false
      if (tagFilter !== '' && !node.complianceTags.includes(tagFilter as ComplianceTag)) {
        return false
      }
      if (needle !== '') {
        const haystack = `${node.title} ${node.content}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })
  }, [nodeList, query, typeFilter, statusFilter, departmentFilter, tagFilter, showArchived])

  const openCreate = () => {
    setEditingNode(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setFormErrors({})
    setDialogOpen(true)
  }

  const openEdit = (node: KnowledgeNode) => {
    setEditingNode(node)
    setForm(toForm(node))
    setFormError(null)
    setFormErrors({})
    setDialogOpen(true)
  }

  const save = async () => {
    if (client === null || workspaceId === null) return
    // Inline validation
    const errors: { title?: string; content?: string } = {}
    if (form.title.trim() === '') errors.title = 'Title is required'
    if (form.content.trim() === '') errors.content = 'Content is required'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setFormError('Please fix the errors below.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = toPayload(form)
      if (editingNode === null) {
        // Optimistic: add placeholder node immediately
        const _optimisticNode: KnowledgeNode = {
          id: `temp-${Date.now()}`,
          organizationId: '',
          workspaceId: workspaceId ?? '',
          departmentId: payload.departmentId,
          title: payload.title,
          content: payload.content,
          type: payload.type,
          status: payload.status,
          importance: payload.importance,
          derivabilityScore: payload.derivabilityScore,
          version: 1,
          validFrom: payload.validFrom,
          validTo: payload.validTo,
          complianceTags: payload.complianceTags ?? [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setDialogOpen(false)
        toast.success(`Created "${payload.title}"`)
        void nodes.refetch()
      } else {
        await client.updateKnowledgeNode(editingNode.id, payload)
        setDialogOpen(false)
        toast.success(`Updated "${payload.title}"`)
        void nodes.refetch()
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Save failed')
      toast.error(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const [archivingNode, setArchivingNode] = React.useState<KnowledgeNode | null>(null)

  const archive = async () => {
    if (client === null || archivingNode === null) return
    try {
      await client.deleteKnowledgeNode(archivingNode.id)
      toast.success(`Archived "${archivingNode.title}"`)
      setArchivingNode(null)
      void nodes.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Archive failed')
    }
  }

  const toggleTag = (tag: ComplianceTag) => {
    setForm((current) => ({
      ...current,
      complianceTags: current.complianceTags.includes(tag)
        ? current.complianceTags.filter((candidate) => candidate !== tag)
        : [...current.complianceTags, tag],
    }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge"
        description="The knowledge base behind the graph — search, filter, and author FACT, CONSTRAINT, DECISION and ANTI_PATTERN nodes."
      >
        <Button onClick={openCreate} disabled={!canWrite}>
          <Plus className="size-4" />
          Add node
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Library className="text-muted-foreground size-4" />
            Knowledge nodes
            <Badge variant="secondary" className="ml-1 font-mono text-[10px]">
              {filtered.length} / {nodeList.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            {canWrite
              ? 'Create and edit nodes; server-side authorization re-validates every mutation.'
              : 'Viewing only — creating or editing nodes requires the WRITE permission (EDITOR or above).'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-52 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => setFilter('q', event.target.value)}
                placeholder="Search title or content…"
                aria-label="Search knowledge nodes"
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border pl-8 text-sm outline-none focus-visible:ring-3"
              />
            </div>
            <FilterSelect
              value={typeFilter}
              onChange={(value) => setFilter('type', value)}
              options={NODE_TYPES}
              placeholder="All types…"
              ariaLabel="Filter by type"
              label="Type"
            />
            <FilterSelect
              value={statusFilter}
              onChange={(value) => setFilter('status', value)}
              options={NODE_STATUSES}
              placeholder="All statuses…"
              ariaLabel="Filter by status"
              label="Status"
            />
            <FilterSelect
              value={departmentFilter}
              onChange={(value) => setFilter('dept', value)}
              options={departmentList.map((department) => department.id)}
              placeholder="All departments…"
              ariaLabel="Filter by department"
              labelById={departmentNameById}
              label="Department"
            />
            <FilterSelect
              value={tagFilter}
              onChange={(value) => setFilter('tag', value)}
              options={COMPLIANCE_TAGS}
              placeholder="All tags…"
              ariaLabel="Filter by compliance tag"
              label="Tag"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter('archived', showArchived ? '' : '1')}
              className="text-muted-foreground h-8"
            >
              {showArchived ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {showArchived ? 'Hide archived' : 'Show archived'}
            </Button>
          </div>

          {/* Table */}
          {nodes.isPending ? (
            <TableSkeleton rows={5} columns={7} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Library}
              title={nodeList.length === 0 ? 'No knowledge nodes' : 'No matches'}
              description={
                nodeList.length === 0
                  ? 'No nodes are visible for your authorization scope. Switch the demo user in the top bar to see more, or add the first node.'
                  : 'Nothing matches the current filters — clear a filter or change the search.'
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-3 py-2.5 font-medium">Node</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Importance</th>
                    <th className="px-3 py-2.5 font-medium">Tags</th>
                    <th className="px-3 py-2.5 font-medium">Department</th>
                    <th className="px-3 py-2.5 font-medium">Updated</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((node) => (
                    <tr
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className="hover:bg-muted/40 even:bg-muted/10 cursor-pointer border-b transition-colors last:border-0"
                    >
                      <td className="max-w-64 px-3 py-2.5">
                        <p className="truncate font-medium" title={node.title}>
                          {node.title}
                        </p>
                        <p className="text-muted-foreground truncate text-xs" title={node.content}>
                          {node.content}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-semibold',
                            NODE_TYPE_COLORS[node.type] ?? '',
                          )}
                        >
                          {node.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-medium',
                            NODE_STATUS_COLORS[node.status] ?? 'text-muted-foreground',
                          )}
                        >
                          {node.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <ImportanceCell value={node.importance} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex max-w-40 flex-wrap gap-1">
                          {node.complianceTags.length === 0 ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            node.complianceTags.map((tag) => (
                              <span
                                key={tag}
                                className="bg-muted text-muted-foreground rounded px-1 py-px font-mono text-[9px]"
                              >
                                {tag}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {node.departmentId !== null
                          ? (departmentNameById.get(node.departmentId) ?? node.departmentId)
                          : '—'}
                      </td>
                      <td className="text-muted-foreground px-3 py-2.5 text-xs">
                        {new Date(node.updatedAt).toLocaleDateString()}
                      </td>
                      <td
                        className="px-3 py-2.5 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(node)}
                              aria-label={`Edit ${node.title}`}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setArchivingNode(node)}
                              aria-label={`Archive ${node.title}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
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

      <NodeEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingNode={editingNode}
        form={form}
        setForm={setForm}
        saving={saving}
        error={formError}
        departmentList={departmentList}
        onToggleTag={toggleTag}
        onSave={() => void save()}
        formErrors={formErrors}
      />

      <KnowledgeNodeDetail
        node={selectedNode}
        workspaceId={workspaceId}
        departmentName={
          selectedNode?.departmentId !== null && selectedNode?.departmentId !== undefined
            ? (departmentNameById.get(selectedNode.departmentId) ?? null)
            : null
        }
        titleById={titleById}
        edges={edges.data ?? []}
        onOpenChange={(open) => {
          if (!open) setSelectedNodeId(null)
        }}
      />

      <ConfirmDialog
        open={archivingNode !== null}
        onOpenChange={(open) => {
          if (!open) setArchivingNode(null)
        }}
        title="Archive knowledge node"
        description={`Archive "${archivingNode?.title ?? ''}"? The node is soft-deleted and no longer returned by queries.`}
        confirmLabel="Archive"
        onConfirm={() => void archive()}
      />
    </div>
  )
}
