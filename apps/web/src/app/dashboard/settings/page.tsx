'use client'

import * as React from 'react'
import { Settings, Landmark, Key, Globe, ShieldCheck, LoaderCircle, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { useCurrentOrganization } from '@/hooks/use-api-query'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes'
import { formatDateTime } from '@/lib/format'

// ---------------------------------------------------------------------------
// Setting row — a label + value pair in a settings card.
// ---------------------------------------------------------------------------
function SettingRow({
  label,
  value,
  mono = false,
  editable = false,
  onChange,
}: {
  label: string
  value: string
  mono?: boolean
  editable?: boolean
  onChange?: (value: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      {editable && onChange !== undefined ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 max-w-xs flex-1 rounded-md border px-2 py-1 text-right text-sm outline-none focus-visible:ring-2"
        />
      ) : (
        <span className={`text-sm font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  const { bootstrap, selectedUser, context } = useApi()
  const organization = useCurrentOrganization()
  const { isDirty: _isDirty, markDirty, markClean } = useUnsavedChangesGuard()

  const _isAdmin = selectedUser?.role === 'ADMIN'

  // Editable workspace name
  const [workspaceName, setWorkspaceName] = React.useState('')
  const [workspaceNameOriginal, setWorkspaceNameOriginal] = React.useState('')
  const [savingWorkspace, setSavingWorkspace] = React.useState(false)

  // Sync workspace name from bootstrap
  React.useEffect(() => {
    if (bootstrap !== null && workspaceNameOriginal === '') {
      setWorkspaceName(bootstrap.workspaceName)
      setWorkspaceNameOriginal(bootstrap.workspaceName)
    }
  }, [bootstrap, workspaceNameOriginal])

  const workspaceNameChanged = workspaceName !== workspaceNameOriginal

  const saveWorkspaceName = React.useCallback(async () => {
    setSavingWorkspace(true)
    try {
      // In a real app, this would call an API. For now, simulate success.
      await new Promise((r) => setTimeout(r, 500))
      setWorkspaceNameOriginal(workspaceName)
      markClean()
      toast.success('Workspace settings saved')
    } catch {
      toast.error('Failed to save workspace settings')
    } finally {
      setSavingWorkspace(false)
    }
  }, [workspaceName, markClean])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace configuration, organization profile, and API access."
      >
        <Badge variant="outline" className="gap-1.5">
          <Settings className="size-3" />
          Workspace
        </Badge>
      </PageHeader>

      {/* Workspace settings — editable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="text-muted-foreground size-4" />
            Workspace
          </CardTitle>
          <CardDescription>
            Active workspace — all knowledge, graph, and pipeline operations are scoped here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {bootstrap === null ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <SettingRow
                label="Workspace name"
                value={workspaceName}
                editable
                onChange={(v) => {
                  setWorkspaceName(v)
                  markDirty()
                }}
              />
              <SettingRow label="Workspace ID" value={bootstrap.workspaceId} mono />
              <SettingRow label="Organization" value={bootstrap.organizationName} />
              <SettingRow label="Organization ID" value={bootstrap.organizationId} mono />
              {workspaceNameChanged && (
                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    onClick={() => void saveWorkspaceName()}
                    disabled={savingWorkspace}
                  >
                    {savingWorkspace ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save changes
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Organization profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Landmark className="text-muted-foreground size-4" />
            Organization
          </CardTitle>
          <CardDescription>Tenant profile from the organizations module.</CardDescription>
        </CardHeader>
        <CardContent>
          {organization.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : organization.data === undefined ? (
            <EmptyState
              icon={Landmark}
              title="No organization"
              description="Connect to the API to view your organization."
            />
          ) : (
            <div className="divide-y">
              <SettingRow label="Name" value={organization.data.name} />
              <SettingRow label="Slug" value={organization.data.slug} mono />
              <SettingRow label="Industry" value={organization.data.industry} />
              <SettingRow label="Status" value={organization.data.status} />
              <SettingRow label="Created" value={formatDateTime(organization.data.createdAt)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auth context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="text-muted-foreground size-4" />
            Authorization Context
          </CardTitle>
          <CardDescription>
            Your compiled authorization context — switch users in the top bar to see how access
            changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {context === null ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="divide-y">
              <SettingRow label="User" value={selectedUser?.name ?? '—'} />
              <SettingRow label="Role" value={context.role} />
              <SettingRow label="Permission Level" value={context.permissionLevel} />
              <SettingRow label="Compliance Clearance" value={context.complianceClearance} />
              <SettingRow
                label="Accessible Departments"
                value={String(context.accessibleDepartmentIds.length)}
              />
              <SettingRow
                label="Effective Compliance Tags"
                value={context.effectiveComplianceTags.join(', ') || 'None'}
              />
              <SettingRow label="Context Compiled At" value={formatDateTime(context.compiledAt)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* API access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Key className="text-muted-foreground size-4" />
            API Access
          </CardTitle>
          <CardDescription>
            API base URL and authentication details for programmatic access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            <SettingRow label="API Base" value="http://localhost:3001/api/v1" mono />
            <SettingRow label="Auth" value="JWT Bearer Token" />
            <SettingRow label="Token Storage" value="LocalStorage (browser only)" />
            <SettingRow
              label="Endpoints"
              value="knowledge, graph, pipeline, rules, permissions, authorization, audit, analytics, configuration, ingestion, evaluation, agents, AI chat, retrieval"
            />
          </div>
        </CardContent>
      </Card>

      {/* Active users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Active Demo Users</CardTitle>
          <CardDescription>
            Seeded demo users in this organization. Switch between them to test role-based access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bootstrap === null ? (
            <Skeleton className="h-24 w-full" />
          ) : bootstrap.users.length === 0 ? (
            <p className="text-muted-foreground text-sm">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="px-3 pb-2 font-medium">Name</th>
                    <th className="px-3 pb-2 font-medium">Email</th>
                    <th className="px-3 pb-2 font-medium">Role</th>
                    <th className="px-3 pb-2 font-medium">Department</th>
                    <th className="px-3 pb-2 font-medium">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {bootstrap.users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{user.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{user.email}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">{user.departmentName ?? '—'}</td>
                      <td className="px-3 py-2 text-xs">
                        {selectedUser?.id === user.id ? (
                          <Badge className="text-[10px]">Current</Badge>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
