'use client'

import { UserRoundCog } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApi } from './api-provider'

/**
 * Demo-user switcher for the header. Visible on every dashboard page next to
 * the theme toggle. Switching user recompiles the authorization context and
 * every page's data refetches — the quickest way to see permission-aware
 * filtering (and the graph/rules engines) react to a different role.
 */
export function DemoUserSwitcher() {
  const { status, users, selectedUser, selectUser } = useApi()

  if (status !== 'ready' || selectedUser === null || users.length === 0) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Select
            value={selectedUser.email}
            onValueChange={(email) => {
              const user = users.find((candidate) => candidate.email === email)
              if (user !== undefined) void selectUser(user)
            }}
          >
            <SelectTrigger
              size="sm"
              className="h-8 gap-1.5 rounded-md px-2 text-xs font-medium"
              aria-label="Switch demo user"
            >
              <UserRoundCog className="text-muted-foreground size-3.5 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {users.map((user) => (
                <SelectItem key={user.id} value={user.email}>
                  <span className="flex items-center justify-between gap-3">
                    <span>{user.name}</span>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {user.role}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        Demo user — switching recompiles your authorization context on every page
      </TooltipContent>
    </Tooltip>
  )
}
