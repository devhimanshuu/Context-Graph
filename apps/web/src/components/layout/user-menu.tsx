'use client'

import * as React from 'react'
import { useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CreditCard, LogOut, Settings, UserRound } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SessionUser } from '@/lib/auth/types'
import { ROUTES } from '@/constants'

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

/* User menu driven by the authenticated session. Sign-out delegates to Clerk (destroys the session server-side) and returns */
export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter()
  const { signOut } = useClerk()
  const [signingOut, setSigningOut] = React.useState(false)

  const handleSignOut = async () => {
    if (signingOut) {
      return
    }
    setSigningOut(true)

    try {
      await signOut(() => router.push(ROUTES.home))
      router.refresh()
    } catch {
      // Keep the user in the workspace; the menu closes and they can retry.
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full"
          aria-label="Open user menu"
        >
          <Avatar size="sm">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="text-foreground text-sm font-medium">{user.name}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">{user.email}</span>
          <span className="text-muted-foreground text-[11px] font-normal">
            {user.organizationName} · {user.role}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserRound />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.settings}>
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <CreditCard />
          Billing
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onSelect={() => void handleSignOut()}
        >
          <LogOut />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
