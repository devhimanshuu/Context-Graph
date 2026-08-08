import { Factory, HeartPulse, Landmark, Scale, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'

interface UseCase {
  industry: string
  icon: LucideIcon
  tone: string
  headline: string
  problem: string
  outcome: string
}

const USE_CASES: readonly UseCase[] = [
  {
    industry: 'Healthcare',
    icon: HeartPulse,
    tone: 'text-rose-500',
    headline: 'Clinical knowledge, safely grounded',
    problem:
      'Care teams needed fast answers without hallucinated or out-of-policy instructions in the loop.',
    outcome:
      'Protocol facts and constraints are permission-gated and compliance-tagged — every answer traces to an approved source.',
  },
  {
    industry: 'Finance',
    icon: Landmark,
    tone: 'text-emerald-500',
    headline: 'Regulatory context you can audit',
    problem:
      'Compliance teams had to reconcile evolving regulation with retrieval results before every filing.',
    outcome:
      'Deterministic rules gate each response, and the full decision path is written to an append-only audit log.',
  },
  {
    industry: 'Legal',
    icon: Scale,
    tone: 'text-violet-500',
    headline: 'Precedent retrieval with privilege intact',
    problem:
      'Firms needed jurisdiction- and matter-scoped retrieval without leaking privileged material across teams.',
    outcome:
      'Matter-level permission profiles isolate every search, and sources are versioned with full provenance.',
  },
  {
    industry: 'Manufacturing',
    icon: Factory,
    tone: 'text-orange-500',
    headline: 'Procedures enforced, not approximated',
    problem:
      'Operators consulted scattered procedure documents, risking stale or superseded instructions.',
    outcome:
      'Supersession and validity windows keep only current procedure knowledge in the traversal path.',
  },
]

/* Industry solutions — one card per vertical, problem-to-outcome framing. */
export function UseCases() {
  return (
    <section
      id="use-cases"
      className="relative scroll-mt-20 overflow-hidden border-t py-20 lg:py-24"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-32 right-1/4 h-80 w-80 rounded-full bg-sky-500/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
            ▸ Use cases
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            Built for your industry, not against it
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            The same governed core adapts to the knowledge your teams actually depend on.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {USE_CASES.map((useCase, index) => (
            <Reveal key={useCase.industry} delay={(index % 2) * 90} className="h-full">
              <Card className="group hover:border-primary/30 relative h-full overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(var(--cg-glow),0.35)]">
                <div
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden="true"
                />
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-primary flex size-10 items-center justify-center rounded-lg border bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 transition-transform duration-300 group-hover:scale-110">
                      <useCase.icon className={cn('size-5', useCase.tone)} />
                    </span>
                    <CardTitle className="text-lg tracking-tight">{useCase.industry}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm font-semibold tracking-tight">{useCase.headline}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{useCase.problem}</p>
                  <p className="border-primary/20 text-muted-foreground border-t pt-3 text-sm leading-relaxed">
                    <span className="text-primary font-medium">Outcome — </span>
                    {useCase.outcome}
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
