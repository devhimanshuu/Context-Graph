import type { Metadata } from 'next'
import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth/auth-shell'
import { CLERK_APPEARANCE } from '@/lib/auth/clerk-appearance'
import { getSession } from '@/lib/auth/session'
import { APP, ROUTES } from '@/constants'

export const metadata: Metadata = {
  title: 'Create account',
}

/* Sign-up page (catch-all). The `[[...signup]]` segment serves `/sign-up` and Clerk's internal */
export default async function SignUpPage() {
  const session = await getSession()
  if (session !== null) {
    redirect(ROUTES.dashboard)
  }

  return (
    <AuthShell>
      <div className="mb-6 text-center">
        <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.22em] uppercase">
          Start your workspace
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Create your{' '}
          <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 bg-clip-text text-transparent">
            {APP.name}
          </span>{' '}
          account
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Set up a governed knowledge graph for your organization.
        </p>
      </div>

      <SignUp
        path={ROUTES.signUp}
        signInUrl={ROUTES.login}
        // New accounts land on the onboarding flow; returning users redirect
        // to the dashboard from the onboarding page itself.
        fallbackRedirectUrl={ROUTES.onboarding}
        appearance={CLERK_APPEARANCE}
      />

      <p className="text-muted-foreground mt-5 text-center text-sm">
        Already have an account?{' '}
        <Link
          href={ROUTES.login}
          className="text-primary hover:text-primary/80 font-medium underline-offset-4 transition-colors hover:underline"
        >
          Sign in
        </Link>
      </p>

      <p className="text-muted-foreground/70 border-border/60 mt-7 border-t pt-5 text-center text-xs">
        Free to start — no credit card required. Cancel anytime.
      </p>
    </AuthShell>
  )
}
