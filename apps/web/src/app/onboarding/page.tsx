import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Boxes, Network, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { AppLogo } from '@/components/layout/app-logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getSession } from '@/lib/auth/session'
import { ROUTES } from '@/constants'

export const metadata: Metadata = {
  title: 'Welcome',
}

const ONBOARDING_STEPS = [
  {
    icon: Boxes,
    title: 'Create your workspace',
    description: 'Name your organization and set up your first workspace.',
  },
  {
    icon: Users,
    title: 'Invite your team',
    description: 'Add members and assign roles — admin, editor, viewer and beyond.',
  },
  {
    icon: Network,
    title: 'Model your knowledge',
    description: 'Capture facts, constraints and decisions as typed knowledge nodes.',
  },
  {
    icon: Sparkles,
    title: 'Connect your AI stack',
    description: 'Point the pipeline at your LLM and assemble your first context package.',
  },
] as const

/* Post-sign-up onboarding. New accounts land here via Clerk's sign-up redirect; */
export default async function OnboardingPage() {
  const session = await getSession()
  if (session === null) {
    redirect(ROUTES.login)
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      {/* Light brand backdrop: wireframe grid + drifting aurora orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="cg-grid-bg absolute inset-0" />
        <div className="absolute -top-48 left-1/2 -ml-[24rem] h-[32rem] w-[48rem]">
          <div className="cg-aurora-a h-full w-full rounded-full bg-indigo-500/20 blur-[110px] dark:bg-indigo-500/25" />
        </div>
        <div className="absolute -right-32 -bottom-40 h-96 w-96">
          <div className="cg-aurora-b h-full w-full rounded-full bg-fuchsia-500/20 blur-[100px] dark:bg-fuchsia-400/25" />
        </div>
        <div className="from-background absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t to-transparent" />
      </div>

      <header className="relative flex items-center justify-between px-4 py-4 md:px-8">
        <AppLogo />
        <ThemeToggle />
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl text-center">
          <Badge
            variant="outline"
            className="bg-background/60 font-mono text-[10px] font-medium tracking-[0.18em] uppercase"
          >
            <span className="relative mr-2 flex size-1.5" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Welcome, {session.name}
          </Badge>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Let&apos;s set up your{' '}
            <span className="animate-cg-shimmer bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 bg-clip-text text-transparent">
              governed workspace
            </span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-base">
            A few quick steps and your organization&apos;s knowledge will be traversed, filtered,
            and assembled for AI — safely and auditably.
          </p>
        </div>

        <ol className="mt-12 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
          {ONBOARDING_STEPS.map(({ icon: Icon, title, description }, index) => (
            <li
              key={title}
              className="bg-background/70 group hover:border-border flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="bg-background/70 flex size-10 items-center justify-center rounded-xl border">
                  <Icon className="text-primary size-5" />
                </span>
                <span className="text-muted-foreground/60 font-mono text-xs">0{index + 1}</span>
              </div>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground mt-1 text-sm">{description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            className="group shadow-[0_8px_32px_-8px_rgba(var(--cg-glow),0.55)] transition-shadow hover:shadow-[0_8px_40px_-6px_rgba(var(--cg-glow),0.7)]"
            asChild
          >
            <Link href={ROUTES.dashboard}>
              Enter dashboard
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={ROUTES.dashboard}>
              <ShieldCheck className="text-primary mr-2 size-4" />
              Skip for now
            </Link>
          </Button>
        </div>

        <p className="text-muted-foreground/70 mt-8 font-mono text-xs">
          <span className="text-emerald-500">✓</span> Secure by default · Multi-tenant · Audit-ready
        </p>
      </main>

      {/* Bottom hairline — matches the auth pages */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="h-14 bg-gradient-to-t from-indigo-500/5 to-transparent" />
        <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
      </div>
    </div>
  )
}
