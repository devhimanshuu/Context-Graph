import { AlertTriangle, ArrowRight, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Reveal } from './reveal'

/**
 * Problem → Solution section: creates urgency by connecting real AI governance
 * failures to the specific capabilities ContextGraph provides.
 */

const PROBLEMS = [
  {
    icon: XCircle,
    stat: '73%',
    label: 'of AI projects fail in production',
    detail: 'due to context governance gaps, hallucinations, and policy violations.',
  },
  {
    icon: AlertTriangle,
    stat: '$4.8M',
    label: 'average cost of an AI incident',
    detail: 'in regulated industries — from unauthorized data exposure to non-compliant outputs.',
  },
  {
    icon: XCircle,
    stat: '41%',
    label: 'of enterprise AI outputs',
    detail:
      'cite sources that violate organizational access policies or contain outdated information.',
  },
] as const

const SOLUTIONS = [
  {
    icon: ShieldCheck,
    title: 'Deterministic rules',
    detail:
      'Versioned, declarative rules gate every context decision — no LLM reasoning about policy.',
  },
  {
    icon: CheckCircle2,
    title: 'Permission-aware retrieval',
    detail:
      'Every query is filtered by role, clearance, and compliance before a single token is assembled.',
  },
  {
    icon: CheckCircle2,
    title: 'Full audit trail',
    detail: 'Append-only logs with before/after snapshots, validity windows, and regulatory tags.',
  },
] as const

export function ProblemSolution() {
  return (
    <section
      id="problem"
      className="bg-muted/30 relative scroll-mt-20 overflow-hidden border-y py-20 lg:py-24"
    >
      <div className="cg-grid-bg absolute inset-0 opacity-40" aria-hidden="true" />

      <div className="relative mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-rose-500 uppercase">
            ▸ The problem
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            AI without governance is a liability
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Retrieval alone cannot enforce policy. When agents access organizational knowledge
            without deterministic guardrails, the risk compounds with every query.
          </p>
        </Reveal>

        {/* Problem cards */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {PROBLEMS.map((problem, index) => (
            <Reveal key={problem.label} delay={index * 80}>
              <Card className="relative overflow-hidden border-rose-500/20">
                <div
                  className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.04] to-transparent"
                  aria-hidden="true"
                />
                <CardContent className="relative p-5">
                  <div className="flex items-start gap-3">
                    <problem.icon className="mt-0.5 size-5 shrink-0 text-rose-500" />
                    <div>
                      <p className="text-2xl font-bold tracking-tight text-rose-500">
                        {problem.stat}
                      </p>
                      <p className="mt-1 text-sm font-medium tracking-tight">{problem.label}</p>
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {problem.detail}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>

        {/* Arrow divider */}
        <Reveal delay={280} className="my-8 flex justify-center">
          <div className="flex flex-col items-center gap-2">
            <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              ContextGraph solves this
            </span>
            <ArrowRight className="text-primary size-5 rotate-90" />
          </div>
        </Reveal>

        {/* Solution cards */}
        <Reveal delay={340}>
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
            {SOLUTIONS.map((solution) => (
              <div key={solution.title} className="flex items-start gap-2.5">
                <solution.icon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold tracking-tight">{solution.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                    {solution.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
