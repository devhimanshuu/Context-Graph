import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from './reveal'
import { ROUTES } from '@/constants'

/* Closing call-to-action panel: drifting aurora orbs over a wireframe grid, */
export function CtaSection() {
  return (
    <section
      id="security"
      className="relative scroll-mt-20 overflow-hidden border-t py-20 lg:py-24"
    >
      <div className="mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border">
            {/* Animated backdrop */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-indigo-500/15 via-transparent to-fuchsia-500/15"
              aria-hidden="true"
            />
            <div className="cg-grid-bg absolute inset-0" aria-hidden="true" />
            <div
              className="cg-aurora-a absolute -top-32 left-1/4 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl dark:bg-indigo-500/30"
              aria-hidden="true"
            />
            <div
              className="cg-aurora-b absolute -right-20 -bottom-32 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl dark:bg-fuchsia-500/30"
              aria-hidden="true"
            />

            <div className="relative mx-auto max-w-2xl px-6 py-16 text-center sm:px-12 lg:py-20">
              {/* Inner content staggers as scale+fade so it doesn't double-
                  slide inside the panel-level reveal below. */}
              <Reveal delay={60} direction="none">
                <p className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
                  ▸ Security first
                </p>
              </Reveal>
              <Reveal delay={140} direction="none">
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
                  Ground your AI in knowledge you can prove
                </h2>
              </Reveal>
              <Reveal delay={220} direction="none">
                <p className="text-muted-foreground mt-4 text-base leading-relaxed">
                  Every query is permission-filtered, rule-checked and fully audited — so your AI
                  only ever sees knowledge you can stand behind.
                </p>
              </Reveal>

              <Reveal delay={300} direction="none">
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    size="lg"
                    className="group shadow-[0_8px_32px_-8px_rgba(var(--cg-glow),0.55)] transition-shadow hover:shadow-[0_8px_40px_-6px_rgba(var(--cg-glow),0.7)]"
                    asChild
                  >
                    <Link href={ROUTES.login}>
                      Sign in to the workspace
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-background/60 backdrop-blur"
                    asChild
                  >
                    <Link href={ROUTES.dashboard}>Take a look around</Link>
                  </Button>
                </div>
              </Reveal>

              <Reveal delay={380} direction="none">
                <p className="text-muted-foreground mt-7 font-mono text-xs">
                  <span className="text-emerald-500">$</span> Secure by default · HIPAA-ready ·
                  Audit-ready
                </p>
              </Reveal>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
