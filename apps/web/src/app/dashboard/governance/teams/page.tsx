'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Plus, Users, UserPlus } from 'lucide-react'

interface Team {
  teamId: string
  name: string
  description: string
  status: string
  memberCount: number
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export default function TeamsPage() {
  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ['governance', 'teams'],
    queryFn: () => fetchJson('/api/v1/governance/teams'),
  })
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">Manage organization teams and memberships</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organization Teams
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={3} columns={4} />
          ) : teams && teams.length > 0 ? (
            <div className="space-y-2">
              {teams.map((t) => (
                <div
                  key={t.teamId}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      <Users className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        <Badge variant={t.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {t.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">{t.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm">{t.memberCount} members</span>
                    <Button size="sm" variant="outline">
                      <UserPlus className="mr-1 h-3 w-3" />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-12 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p>No teams created yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
