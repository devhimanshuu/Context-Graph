'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SessionUser } from '@/lib/auth/types'
import type { ApiEnvelope, ApiErrorEnvelope } from '@/dto'

interface LoginFormProps {
  /** Route to land on after a successful sign-in. */
  next: string
  /** Demo emails offered as one-click fills during the mock phase. */
  demoEmails: readonly string[]
}

/**
 * Sign-in form. Posts to `/api/auth/login` (mock bridge — replaced by
 * Supabase Auth in Phase 3) and navigates to the dashboard on success.
 */
export function LoginForm({ next, demoEmails }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }) // The login endpoint returns the SessionUser shape (type-only import —
      // safe in a client component; no server-only code is pulled in).
      const body = (await response.json()) as ApiEnvelope<{ user: SessionUser }> | ApiErrorEnvelope

      if (!response.ok) {
        setError(body.success ? 'Sign-in failed' : body.error.message)
        return
      }

      router.push(next)
      router.refresh()
    } catch {
      setError('Could not reach the sign-in service')
    } finally {
      setSubmitting(false)
    }
  }

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('demo')
    setError(null)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@organization.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {error !== null && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4" />
        )}
        Sign in
      </Button>

      <div className="space-y-2 rounded-lg border border-dashed p-3">
        <p className="text-muted-foreground text-xs">
          Demo workspace — pick an account (password <code className="font-mono">demo</code>):
        </p>
        <div className="flex flex-wrap gap-1.5">
          {demoEmails.slice(0, 3).map((demoEmail) => (
            <button
              key={demoEmail}
              type="button"
              onClick={() => fillDemo(demoEmail)}
              className="text-muted-foreground hover:text-foreground hover:border-primary/40 rounded-md border px-2 py-1 text-[11px] transition-colors"
            >
              {demoEmail}
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}
