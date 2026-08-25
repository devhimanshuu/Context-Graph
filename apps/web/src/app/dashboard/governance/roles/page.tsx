'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Plus, ShieldCheck, Users, Lock } from 'lucide-react'

interface CustomRole {
  roleId: string
  name: string
  description: string
  permissions: string[]
  isBuiltIn: boolean
  status: string
  userCount: number
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export default function RolesPage() {
  const { data: roles, isLoading } = useQuery<CustomRole[]>({
    queryKey: ['governance', 'roles'],
    queryFn: () => fetchJson('/api/v1/governance/roles'),
  })
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles</h1>
          <p className="text-muted-foreground">Manage roles and permission assignments</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Organization Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : roles && roles.length > 0 ? (
            <div className="space-y-2">
              {roles.map((r) => (
                <div
                  key={r.roleId}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      {r.isBuiltIn ? (
                        <Lock className="text-primary h-5 w-5" />
                      ) : (
                        <ShieldCheck className="text-primary h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.name}</span>
                        {r.isBuiltIn && (
                          <Badge variant="outline" className="text-xs">
                            Built-in
                          </Badge>
                        )}
                        <Badge variant={r.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {r.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">{r.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground flex items-center gap-1 text-sm">
                      <Users className="h-3 w-3" />
                      {r.userCount} users
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {r.permissions.length} permissions
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-12 text-center">
              <ShieldCheck className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p>No custom roles created</p>
              <p className="text-sm">Default roles are available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
