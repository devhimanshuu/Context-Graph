import type { Metadata } from 'next'
import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth/auth-shell'
import { CLERK_APPEARANCE } from '@/lib/auth/clerk-appearance'
import { getSession } from '@/lib/auth/session'
import { APP, ROUTES } from '@/constants'

export const metadata: Metadata = {
  title: 'Sign in',
}

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>
}

/* Sign-in page (catch-all). The `[[...signin]]` segment is the idiomatic Clerk App Router pattern: it */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession()
  if (session !== null) {
    redirect(ROUTES.dashboard)
  }

  const { next } = await searchParams
  // Only accept same-origin relative paths; reject protocol-relative (`//host`)
  // and absolute URLs to prevent an open redirect after sign-in.
  const isSafeRelativePath = next !== undefined && next.startsWith('/') && !next.startsWith('//')
  const nextPath = isSafeRelativePath ? next : ROUTES.dashboard

  return (
    <AuthShell>
      <div className="mb-6 text-center">
        <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.22em] uppercase">
          Secure access
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Sign in to{' '}
          <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 bg-clip-text text-transparent">
            {APP.name}
          </span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Welcome back — your governed context is ready.
        </p>
      </div>

      <SignIn
        path={ROUTES.login}
        signUpUrl={ROUTES.signUp}
        fallbackRedirectUrl={nextPath}
        appearance={CLERK_APPEARANCE}
      />

      <p className="text-muted-foreground mt-5 text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link
          href={ROUTES.signUp}
          className="text-primary hover:text-primary/80 font-medium underline-offset-4 transition-colors hover:underline"
        >
          Create one
        </Link>
      </p>

      <p className="text-muted-foreground/70 border-border/60 mt-7 border-t pt-5 text-center text-xs">
        Protected by enterprise-grade security — SSO, MFA, and full audit trails.
      </p>
    </AuthShell>
  )
}
