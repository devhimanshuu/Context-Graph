'use client'

import * as React from 'react'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
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
import { useDepartments } from '@/hooks/use-api-query'
import type { Department } from '@/lib/api/types'

interface DepartmentNode extends Department {
  children: DepartmentNode[]
}

/** Builds the department tree from a flat list (stable by code). */
function buildTree(departments: Department[]): DepartmentNode[] {
  const byId = new Map<string, DepartmentNode>()
  for (const department of departments) {
    byId.set(department.id, { ...department, children: [] })
  }
  const roots: DepartmentNode[] = []
  for (const node of byId.values()) {
    const parent = node.parentId !== null ? byId.get(node.parentId) : undefined
    if (parent !== undefined) parent.children.push(node)
    else roots.push(node)
  }
  const sortByName = (nodes: DepartmentNode[]): DepartmentNode[] => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    for (const node of nodes) sortByName(node.children)
    return nodes
  }
  return sortByName(roots)
}

export default function DepartmentsPage() {
  const { client, bootstrap, selectedUser } = useApi()
  const organizationId = bootstrap?.organizationId ?? null

  const departments = useDepartments(organizationId)
  const departmentList = React.useMemo(() => departments.data ?? [], [departments.data])
  const tree = React.useMemo(() => buildTree(departmentList), [departmentList])

  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState({ name: '', code: '', parentId: '' })
  const [saving, setSaving] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const canManage = selectedUser?.role === 'ADMIN' || selectedUser?.role === 'HOD'

  const openCreate = () => {
    setEditingId(null)
    setForm({ name: '', code: '', parentId: '' })
    setActionError(null)
    setDialogOpen(true)
  }

  const openEdit = (department: Department) => {
    setEditingId(department.id)
    setForm({
      name: department.name,
      code: department.code,
      parentId: department.parentId ?? '',
    })
    setActionError(null)
    setDialogOpen(true)
  }

  const save = async () => {
    if (client === null || organizationId === null) return
    setSaving(true)
    setActionError(null)
    try {
      const payload = {
        name: form.name,
        code: form.code,
        parentId: form.parentId === '' ? null : form.parentId,
      }
      if (editingId === null) {
        await client.createDepartment(organizationId, payload)
      } else {
        await client.updateDepartment(editingId, payload)
      }
      setDialogOpen(false)
      void departments.refetch()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (department: Department) => {
    if (client === null || !window.confirm(`Delete ${department.name}?`)) return
    try {
      await client.deleteDepartment(department.id)
      void departments.refetch()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  const toggleCollapsed = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderNode = (node: DepartmentNode, depth: number) => {
    const isCollapsed = collapsed.has(node.id)
    return (
      <li key={node.id} className="space-y-1">
        <div
          className="hover:bg-muted/50 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
          style={{ marginLeft: `${depth * 20}px` }}
        >
          {node.children.length > 0 ? (
            <button
              type="button"
              onClick={() => toggleCollapsed(node.id)}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              {isCollapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
          ) : (
            <span className="shrink-0" style={{ width: 16 }} />
          )}
          <Building2 className="text-muted-foreground size-4 shrink-0" />
          <span className="font-medium">{node.name}</span>
          <Badge variant="outline" className="font-mono text-[9px] font-normal">
            {node.code}
          </Badge>
          <Badge variant="outline" className="text-[9px] font-normal">
            L{node.hierarchyLevel}
          </Badge>
          {canManage && (
            <div className="ml-auto flex items-center gap-0.5">
              <Button variant="ghost" size="sm" onClick={() => openEdit(node)}>
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => void remove(node)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
        {!isCollapsed && node.children.length > 0 && (
          <ul className="space-y-1">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="The organizational hierarchy that shapes department-level authorization — child departments inherit parent access."
      >
        <Button onClick={openCreate} disabled={!canManage}>
          <Plus className="size-4" />
          Add department
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Hierarchy</CardTitle>
          <CardDescription>
            {canManage
              ? 'Create, rename, or reparent departments (ADMIN/HOD).'
              : 'Read-only — management requires ADMIN or HOD.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {departments.isPending ? (
            <Skeleton className="h-48 w-full" />
          ) : tree.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No departments"
              description="Create the first department to start building the hierarchy."
            />
          ) : (
            <ul className="space-y-1">{tree.map((node) => renderNode(node, 0))}</ul>
          )}
          {actionError !== null && (
            <p className="text-destructive mt-3 flex items-center gap-1.5 text-xs">
              <CircleAlert className="size-3.5" />
              {actionError}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId === null ? 'Add department' : 'Edit department'}</DialogTitle>
            <DialogDescription>
              Department access policies use the hierarchy — parent departments grant access to
              children.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="space-y-1.5">
              <span className="text-muted-foreground block text-xs font-medium">Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-muted-foreground block text-xs font-medium">Code</span>
                <input
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value })}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-muted-foreground block text-xs font-medium">Parent</span>
                <select
                  value={form.parentId}
                  onChange={(event) => setForm({ ...form, parentId: event.target.value })}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none"
                >
                  <option value="">Root</option>
                  {departmentList
                    .filter((department) => department.id !== editingId)
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            {actionError !== null && (
              <p className="text-destructive flex items-center gap-1.5 text-xs">
                <CircleAlert className="size-3.5" />
                {actionError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void save()}
              disabled={saving || form.name === '' || form.code === ''}
            >
              {saving ? <LoaderCircle className="animate-spin" /> : null}
              {editingId === null ? 'Create department' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
