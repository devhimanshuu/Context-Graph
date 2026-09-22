'use client'

import * as React from 'react'
import {
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/dashboard/empty-state'
import { ROLE_TINTED_COLORS } from '@/lib/tokens'
import { PageHeader } from '@/components/dashboard/page-header'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { useDepartments, useUsers } from '@/hooks/use-api-query'
import { useTableControls } from '@/hooks/use-table-controls'
import type { UserRecord } from '@/lib/api/types'

const ROLES = ['ADMIN', 'HOD', 'EDITOR', 'VIEWER', 'QUALITY', 'AUDITOR'] as const
const LEVELS = ['NONE', 'READ', 'WRITE', 'ADMIN'] as const
const CLEARANCES = ['NONE', 'STANDARD', 'SENSITIVE', 'RESTRICTED', 'CRITICAL'] as const

interface UserFormState {
  name: string
  email: string
  role: string
  permissionLevel: string
  complianceClearance: string
  departmentId: string
}

const EMPTY_FORM: UserFormState = {
  name: '',
  email: '',
  role: 'VIEWER',
  permissionLevel: 'READ',
  complianceClearance: 'STANDARD',
  departmentId: '',
}

export default function UsersPage() {
  const { client, bootstrap, selectedUser } = useApi()
  const organizationId = bootstrap?.organizationId ?? null

  const users = useUsers()
  const departments = useDepartments(organizationId)
  const departmentList = React.useMemo(() => departments.data ?? [], [departments.data])

  const [form, setForm] = React.useState<UserFormState>(EMPTY_FORM)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setActionError(null)
    setDialogOpen(true)
  }

  const openEdit = (user: UserRecord) => {
    setEditingId(user.id)
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      permissionLevel: user.permissionLevel,
      complianceClearance: user.complianceClearance,
      departmentId: user.departmentId ?? '',
    })
    setActionError(null)
    setDialogOpen(true)
  }

  const save = async () => {
    if (client === null) return
    setSaving(true)
    setActionError(null)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role as UserRecord['role'],
        permissionLevel: form.permissionLevel as UserRecord['permissionLevel'],
        complianceClearance: form.complianceClearance as UserRecord['complianceClearance'],
        departmentId: form.departmentId === '' ? null : form.departmentId,
      }
      if (editingId === null) {
        await client.createUser(payload)
      } else {
        await client.updateUser(editingId, payload)
      }
      setDialogOpen(false)
      void users.refetch()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const [deletingUser, setDeletingUser] = React.useState<UserRecord | null>(null)

  const remove = async () => {
    if (client === null || deletingUser === null) return
    try {
      await client.deleteUser(deletingUser.id)
      toast.success(`Deleted ${deletingUser.name}`)
      setDeletingUser(null)
      void users.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  const canManage = selectedUser?.role === 'ADMIN' || selectedUser?.role === 'HOD'
  const rawUserList = users.data ?? []
  const departmentNameById = React.useMemo(
    () => new Map(departmentList.map((d) => [d.id, d.name])),
    [departmentList],
  )
  const controls = useTableControls<UserRecord>(rawUserList, {
    searchFields: ['name', 'email', 'role', 'permissionLevel', 'complianceClearance'],
    initialSortKey: 'name',
    sortValues: {
      department: (row) => departmentNameById.get(row.departmentId ?? '') ?? '',
    },
  })
  const { query, setQuery, sortKey, sortDir, toggleSort, rows: userList } = controls

  const sortableHeader = (label: string, key: string): React.ReactNode => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
      aria-label={`Sort by ${label}`}
    >
      {label}
      {sortKey === key && (
        <span aria-hidden="true" className="text-[9px]">
          {sortDir === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Organization members, roles, permission levels, and compliance clearances — managed against the NestJS users module."
      >
        <Button onClick={openCreate} disabled={!canManage}>
          <Plus className="size-4" />
          Add user
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {canManage
              ? 'Create, edit, or deactivate members. Changes recompile the authorization context on next request.'
              : 'Viewing only — user management requires ADMIN or HOD.'}
          </CardDescription>
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, role…"
              className="border-input bg-background placeholder:text-muted-foreground h-9 w-full rounded-md border pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Search users"
            />
          </div>
        </CardHeader>
        <CardContent>
          {users.isPending ? (
            <TableSkeleton rows={5} columns={7} />
          ) : userList.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No users"
              description="No members found in this organization."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="pr-4 pb-2 font-medium">{sortableHeader('Name', 'name')}</th>
                    <th className="pr-4 pb-2 font-medium">{sortableHeader('Role', 'role')}</th>
                    <th className="pr-4 pb-2 font-medium">
                      {sortableHeader('Level', 'permissionLevel')}
                    </th>
                    <th className="pr-4 pb-2 font-medium">
                      {sortableHeader('Clearance', 'complianceClearance')}
                    </th>
                    <th className="pr-4 pb-2 font-medium">
                      {sortableHeader('Department', 'department')}
                    </th>
                    <th className="pr-4 pb-2 font-medium">
                      {sortableHeader('Status', 'isActive')}
                    </th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-muted-foreground text-xs">{user.email}</p>
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium ${ROLE_TINTED_COLORS[user.role] ?? ''}`}
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{user.permissionLevel}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{user.complianceClearance}</td>
                      <td className="py-2.5 pr-4 text-xs">
                        {departmentList.find((department) => department.id === user.departmentId)
                          ?.name ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          variant="outline"
                          className={
                            user.status === 'ACTIVE'
                              ? 'border-emerald-500/40 text-[10px] text-emerald-600 dark:text-emerald-400'
                              : 'text-muted-foreground text-[10px]'
                          }
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right">
                        {canManage ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setDeletingUser(user)}
                              aria-label={`Delete ${user.name}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <DialogTitle>{editingId === null ? 'Add user' : 'Edit user'}</DialogTitle>
            <DialogDescription>
              Server-side authorization is derived from these values — never from the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Name">
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none"
              />
            </Field>
            <Field label="Email">
              <input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Permission level">
                <select
                  value={form.permissionLevel}
                  onChange={(event) => setForm({ ...form, permissionLevel: event.target.value })}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none"
                >
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Compliance clearance">
                <select
                  value={form.complianceClearance}
                  onChange={(event) =>
                    setForm({ ...form, complianceClearance: event.target.value })
                  }
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none"
                >
                  {CLEARANCES.map((clearance) => (
                    <option key={clearance} value={clearance}>
                      {clearance}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Department">
                <select
                  value={form.departmentId}
                  onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none"
                >
                  <option value="">None</option>
                  {departmentList.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </Field>
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
              disabled={saving || form.name === '' || form.email === ''}
            >
              {saving ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {editingId === null ? 'Create user' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingUser !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null)
        }}
        title="Delete user"
        description={`Delete ${deletingUser?.name ?? ''}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => void remove()}
      />
    </div>
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
