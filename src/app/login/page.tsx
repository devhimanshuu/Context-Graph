import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AppLogo } from '@/components/layout/app-logo'
import { LoginForm } from './login-form'
import { getSession } from '@/lib/auth/session'
import { DEMO_EMAILS } from '@/services/auth/auth.service'
import { ROUTES } from '@/constants'

export const metadata: Metadata = {
  title: 'Sign in',
}

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>
}

/**
 * Sign-in page.
 *
 * Server component: already-signed-in users are redirected straight into the
 * workspace; the `next` query param preserves the intended destination.
 */
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
    <div className="flex min-h-svh flex-col">
      <div className="flex items-center justify-between px-4 py-4 md:px-6">
        <AppLogo href={ROUTES.home} />
        <Link
          href={ROUTES.home}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to home
        </Link>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="border-border/80 bg-card w-full max-w-sm rounded-2xl border p-8 shadow-lg">
          <div className="space-y-1.5 text-center">
            <h1 className="text-xl font-semibold tracking-tight">Sign in to ContextGraph</h1>
            <p className="text-muted-foreground text-sm">
              Access your organization&apos;s knowledge workspace
            </p>
          </div>

          <div className="mt-6">
            <LoginForm next={nextPath} demoEmails={DEMO_EMAILS} />
          </div>
        </div>
      </main>
    </div>
  )
}
