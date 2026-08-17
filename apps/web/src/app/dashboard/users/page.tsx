'use client'

import * as React from 'react'
import {
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
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
import { useDepartments, useUsers } from '@/hooks/use-api-query'
import type { UserRecord } from '@/lib/api/types'

const ROLES = ['ADMIN', 'HOD', 'EDITOR', 'VIEWER', 'QUALITY', 'AUDITOR'] as const
const LEVELS = ['NONE', 'READ', 'WRITE', 'ADMIN'] as const
const CLEARANCES = ['NONE', 'STANDARD', 'SENSITIVE', 'RESTRICTED', 'CRITICAL'] as const

const ROLE_TONE: Record<string, string> = {
  ADMIN: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  HOD: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  QUALITY: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  AUDITOR: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  EDITOR: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  VIEWER: '',
}

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

  const remove = async (user: UserRecord) => {
    if (client === null || !window.confirm(`Delete ${user.name}? This cannot be undone.`)) return
    try {
      await client.deleteUser(user.id)
      void users.refetch()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  const canManage = selectedUser?.role === 'ADMIN' || selectedUser?.role === 'HOD'
  const userList = users.data ?? []

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
        </CardHeader>
        <CardContent>
          {users.isPending ? (
            <Skeleton className="h-48 w-full" />
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
                    <th className="pr-4 pb-2 font-medium">Name</th>
                    <th className="pr-4 pb-2 font-medium">Role</th>
                    <th className="pr-4 pb-2 font-medium">Level</th>
                    <th className="pr-4 pb-2 font-medium">Clearance</th>
                    <th className="pr-4 pb-2 font-medium">Department</th>
                    <th className="pr-4 pb-2 font-medium">Status</th>
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
                          className={`text-[10px] font-medium ${ROLE_TONE[user.role] ?? ''}`}
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
                              onClick={() => void remove(user)}
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
