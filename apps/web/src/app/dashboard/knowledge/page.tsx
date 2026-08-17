'use client'

import * as React from 'react'
import {
  CircleAlert,
  Eye,
  EyeOff,
  Library,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
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
import { KnowledgeNodeDetail } from '@/components/dashboard/knowledge-node-detail'
import { useDepartments, useGraphEdges, useKnowledgeNodes } from '@/hooks/use-api-query'
import { COMPLIANCE_TAG_DESCRIPTIONS } from '@/constants/domain'
import { cn } from '@/lib/utils'
import type {
  ComplianceTag,
  Department,
  KnowledgeNode,
  NodeStatus,
  NodeType,
} from '@/lib/api/types'

const NODE_TYPES: NodeType[] = ['FACT', 'CONSTRAINT', 'DECISION', 'ANTI_PATTERN']
const NODE_STATUSES: NodeStatus[] = [
  'DRAFT',
  'ACTIVE',
  'SUPERSEDED',
  'EXPIRED',
  'LEGAL_HOLD',
  'REVIEW_REQUIRED',
  'ARCHIVED',
]
const COMPLIANCE_TAGS: ComplianceTag[] = [
  'HIPAA',
  'GDPR',
  'PCI_DSS',
  'SOC2',
  'SOX',
  'FINRA',
  'ISO_27001',
  'PHI',
  'PII',
  'CONFIDENTIAL',
  'RESTRICTED',
  'INTERNAL',
  'PUBLIC',
]

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

/** The roles that may create/edit nodes (server enforces the real boundary via WRITE permission). */
const CAN_WRITE_ROLES = ['ADMIN', 'HOD', 'EDITOR'] as const
/** Soft-delete is restricted server-side to ADMIN/QUALITY. */
const CAN_DELETE_ROLES = ['ADMIN', 'QUALITY'] as const

interface NodeFormState {
  title: string
  content: string
  type: NodeType
  status: NodeStatus
  importance: number
  derivabilityScore: number
  complianceTags: ComplianceTag[]
  departmentId: string
  validFrom: string
  validTo: string
}

const EMPTY_FORM: NodeFormState = {
  title: '',
  content: '',
  type: 'FACT',
  status: 'DRAFT',
  importance: 50,
  derivabilityScore: 30,
  complianceTags: [],
  departmentId: '',
  validFrom: '',
  validTo: '',
}

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

  // -- Filters (client-side presentation only; server stays authoritative) --
  const [query, setQuery] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<string>('')
  const [statusFilter, setStatusFilter] = React.useState<string>('')
  const [departmentFilter, setDepartmentFilter] = React.useState<string>('')
  const [tagFilter, setTagFilter] = React.useState<string>('')
  const [showArchived, setShowArchived] = React.useState(false)

  // -- Editor dialog --
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingNode, setEditingNode] = React.useState<KnowledgeNode | null>(null)
  const [form, setForm] = React.useState<NodeFormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

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
    setDialogOpen(true)
  }

  const openEdit = (node: KnowledgeNode) => {
    setEditingNode(node)
    setForm(toForm(node))
    setFormError(null)
    setDialogOpen(true)
  }

  const save = async () => {
    if (client === null || workspaceId === null) return
    if (form.title.trim() === '' || form.content.trim() === '') {
      setFormError('Title and content are required.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = toPayload(form)
      if (editingNode === null) {
        await client.createKnowledgeNode(workspaceId, payload)
      } else {
        await client.updateKnowledgeNode(editingNode.id, payload)
      }
      setDialogOpen(false)
      void nodes.refetch()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const archive = async (node: KnowledgeNode) => {
    if (client === null) return
    if (
      !window.confirm(
        `Archive "${node.title}"? The node is soft-deleted and no longer returned by queries.`,
      )
    ) {
      return
    }
    try {
      await client.deleteKnowledgeNode(node.id)
      void nodes.refetch()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Archive failed')
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
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title or content…"
                aria-label="Search knowledge nodes"
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border pl-8 text-sm outline-none focus-visible:ring-3"
              />
            </div>
            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={NODE_TYPES}
              placeholder="All types"
              ariaLabel="Filter by type"
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={NODE_STATUSES}
              placeholder="All statuses"
              ariaLabel="Filter by status"
            />
            <FilterSelect
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={departmentList.map((department) => department.id)}
              placeholder="All departments"
              ariaLabel="Filter by department"
              labelById={departmentNameById}
            />
            <FilterSelect
              value={tagFilter}
              onChange={setTagFilter}
              options={COMPLIANCE_TAGS}
              placeholder="All tags"
              ariaLabel="Filter by compliance tag"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived((value) => !value)}
              className="text-muted-foreground h-8"
            >
              {showArchived ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {showArchived ? 'Hide archived' : 'Show archived'}
            </Button>
          </div>

          {/* Table */}
          {nodes.isPending ? (
            <Skeleton className="h-64 w-full" />
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="pr-4 pb-2 font-medium">Node</th>
                    <th className="pr-4 pb-2 font-medium">Type</th>
                    <th className="pr-4 pb-2 font-medium">Status</th>
                    <th className="pr-4 pb-2 font-medium">Importance</th>
                    <th className="pr-4 pb-2 font-medium">Tags</th>
                    <th className="pr-4 pb-2 font-medium">Department</th>
                    <th className="pr-4 pb-2 font-medium">Updated</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((node) => (
                    <tr
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className="hover:bg-muted/40 cursor-pointer border-b last:border-0"
                    >
                      <td className="max-w-64 py-2.5 pr-4">
                        <p className="truncate font-medium" title={node.title}>
                          {node.title}
                        </p>
                        <p className="text-muted-foreground truncate text-xs" title={node.content}>
                          {node.content}
                        </p>
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] font-semibold', TYPE_TONE[node.type] ?? '')}
                        >
                          {node.type}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-medium',
                            STATUS_TONE[node.status] ?? 'text-muted-foreground',
                          )}
                        >
                          {node.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4">
                        <ImportanceCell value={node.importance} />
                      </td>
                      <td className="py-2.5 pr-4">
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
                      <td className="py-2.5 pr-4 text-xs">
                        {node.departmentId !== null
                          ? (departmentNameById.get(node.departmentId) ?? node.departmentId)
                          : '—'}
                      </td>
                      <td className="text-muted-foreground py-2.5 pr-4 text-xs">
                        {new Date(node.updatedAt).toLocaleDateString()}
                      </td>
                      <td
                        className="py-2.5 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {canWrite && (
                            <Button variant="ghost" size="sm" onClick={() => openEdit(node)}>
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => void archive(node)}
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
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  labelById,
}: {
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  placeholder: string
  ariaLabel: string
  labelById?: Map<string, string>
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border px-2 text-sm outline-none focus-visible:ring-3"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {labelById?.get(option) ?? option}
        </option>
      ))}
    </select>
  )
}

function ImportanceCell({ value }: { value: number }) {
  const tone =
    value >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : value >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground'
  return (
    <span className={cn('font-mono text-xs font-medium', tone)} title={`Importance ${value}/100`}>
      {value}
    </span>
  )
}

function NodeEditorDialog({
  open,
  onOpenChange,
  editingNode,
  form,
  setForm,
  saving,
  error,
  departmentList,
  onToggleTag,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingNode: KnowledgeNode | null
  form: NodeFormState
  setForm: React.Dispatch<React.SetStateAction<NodeFormState>>
  saving: boolean
  error: string | null
  departmentList: Department[]
  onToggleTag: (tag: ComplianceTag) => void
  onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editingNode === null ? 'Add knowledge node' : 'Edit node'}</DialogTitle>
          <DialogDescription>
            Server-side validation and authorization remain authoritative — this form only improves
            the editing experience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Title">
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="e.g. TKR requires 6 weeks of conservative therapy"
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
            />
          </Field>
          <Field label="Content">
            <textarea
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              rows={4}
              placeholder="The knowledge the node carries — kept verbatim for context assembly."
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:ring-3"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as NodeType })}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                {NODE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as NodeStatus })}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                {NODE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`Importance — ${form.importance}`}>
              <input
                type="range"
                min={0}
                max={100}
                value={form.importance}
                onChange={(event) => setForm({ ...form, importance: Number(event.target.value) })}
                className="w-full accent-indigo-500"
              />
            </Field>
            <Field label={`Derivability — ${form.derivabilityScore}`}>
              <input
                type="range"
                min={0}
                max={100}
                value={form.derivabilityScore}
                onChange={(event) =>
                  setForm({ ...form, derivabilityScore: Number(event.target.value) })
                }
                className="w-full accent-sky-500"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Department">
              <select
                value={form.departmentId}
                onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                <option value="">None</option>
                {departmentList.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Validity window (optional)">
              <div className="flex items-center gap-1.5">
                <input
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(event) => setForm({ ...form, validFrom: event.target.value })}
                  aria-label="Valid from"
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2 text-xs outline-none focus-visible:ring-3"
                />
                <span className="text-muted-foreground">→</span>
                <input
                  type="datetime-local"
                  value={form.validTo}
                  onChange={(event) => setForm({ ...form, validTo: event.target.value })}
                  aria-label="Valid until"
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2 text-xs outline-none focus-visible:ring-3"
                />
              </div>
            </Field>
          </div>

          <Field label={`Compliance tags (${form.complianceTags.length})`}>
            <div className="flex flex-wrap gap-1.5">
              {COMPLIANCE_TAGS.map((tag) => {
                const active = form.complianceTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggleTag(tag)}
                    aria-pressed={active}
                    title={COMPLIANCE_TAG_DESCRIPTIONS[tag]}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-md border px-2 py-1 text-left transition-colors',
                      active
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <span
                      className={cn(
                        'font-mono text-[10px] font-medium',
                        active
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {tag}
                    </span>
                    <span
                      className={cn(
                        'max-w-28 text-[9px] leading-tight',
                        active
                          ? 'text-indigo-500/70 dark:text-indigo-400/70'
                          : 'text-muted-foreground/60',
                      )}
                    >
                      {COMPLIANCE_TAG_DESCRIPTIONS[tag]}
                    </span>
                  </button>
                )
              })}
            </div>
          </Field>

          {editingNode !== null && (
            <p className="text-muted-foreground text-[11px]">
              v{editingNode.version} · updated {new Date(editingNode.updatedAt).toLocaleString()}
            </p>
          )}
          {error !== null && (
            <p className="text-destructive flex items-center gap-1.5 text-xs">
              <CircleAlert className="size-3.5" />
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || form.title.trim() === ''}>
            {saving ? <LoaderCircle className="animate-spin" /> : null}
            {editingNode === null ? 'Create node' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-muted-foreground block text-xs font-medium">{label}</span>
      {children}
    </label>
  )
}
