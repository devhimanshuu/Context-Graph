import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants'

/**
 * Closing call-to-action band.
 */
export function CtaSection() {
  return (
    <section id="security" className="scroll-mt-20 border-t py-20 lg:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="border-border/80 via-background relative overflow-hidden rounded-3xl border bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 px-6 py-16 text-center sm:px-12">
          <div className="cg-grid-bg absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Ground your AI in knowledge you can prove
            </h2>
            <p className="text-muted-foreground mt-3 text-base">
              Audit trails, permission-aware retrieval and deterministic rules — the foundation is
              ready. The engines are next.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href={ROUTES.login}>
                  Sign in to the workspace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href={ROUTES.dashboard}>Take a look around</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
