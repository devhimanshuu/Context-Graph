import { Database, KeyRound, Sparkles } from 'lucide-react'
import { Reveal } from './reveal'

const STEPS = [
  {
    step: '01',
    tag: 'Model',
    icon: Database,
    title: 'Model your knowledge',
    description:
      'Capture facts, constraints and decisions as typed knowledge — organized by workspace and department, and adaptable to any domain.',
  },
  {
    step: '02',
    tag: 'Enforce',
    icon: KeyRound,
    title: 'Enforce rules & permissions',
    description:
      'Deterministic rules and permission profiles gate every read. Role, permission level and compliance clearance are evaluated together.',
  },
  {
    step: '03',
    tag: 'Assemble',
    icon: Sparkles,
    title: 'Assemble context for AI',
    description:
      'Traversal output, rule results and permissions are composed into auditable, token-budgeted context packages for your LLMs.',
  },
] as const

/* Three-phase pipeline: phase badges on an animated gradient rail, each step */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-muted/30 relative scroll-mt-20 overflow-hidden border-y py-20 lg:py-24"
    >
      <div className="cg-grid-bg absolute inset-0 opacity-60" aria-hidden="true" />

      <div className="relative mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h3 className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
            How it works
          </h3>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            From raw knowledge to grounded AI context
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Three deterministic phases turn organizational knowledge into audit-ready context for
            your LLMs.
          </p>
        </Reveal>

        <ol className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          {/* Animated connecting rail */}
          <div className="absolute top-7 right-[16%] left-[16%] hidden md:block" aria-hidden="true">
            <div className="border-muted-foreground/25 dark:border-muted-foreground/40 border-t border-dashed" />
            <div className="animate-cg-shimmer absolute inset-x-0 top-0 h-px bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 opacity-50 dark:opacity-80" />
          </div>

          {STEPS.map((item, index) => (
            <li key={item.step} className="relative">
              <Reveal
                delay={index * 140}
                className="group flex h-full flex-col items-center text-center"
              >
                <div className="relative">
                  {/* Glow ring behind the icon tile */}
                  <div
                    className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-500/25 to-fuchsia-500/25 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                  <div className="border-border bg-background relative flex size-14 items-center justify-center rounded-2xl border shadow-lg transition-transform duration-300 group-hover:scale-105">
                    <item.icon className="text-primary size-6" />
                  </div>
                  {/* Gradient phase badge */}
                  <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 font-mono text-[10px] font-bold text-white shadow-md">
                    {item.step}
                  </span>
                </div>

                <div className="mt-6 space-y-2">
                  <p className="font-mono text-[10px] font-medium tracking-[0.25em] text-sky-500 uppercase">
                    Phase · {item.tag}
                  </p>
                  <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
                  <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
