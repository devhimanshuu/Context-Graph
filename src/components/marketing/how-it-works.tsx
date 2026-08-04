import { Database, KeyRound, Sparkles } from 'lucide-react'

const STEPS = [
  {
    step: '01',
    icon: Database,
    title: 'Model your knowledge',
    description:
      'Organizations, workspaces, departments and typed knowledge nodes — the generic schema adapts to any domain without refactoring.',
  },
  {
    step: '02',
    icon: KeyRound,
    title: 'Enforce rules & permissions',
    description:
      'Deterministic rules and permission profiles gate every read. Role, permission level and compliance clearance are evaluated together.',
  },
  {
    step: '03',
    icon: Sparkles,
    title: 'Assemble context for AI',
    description:
      'Traversal output, rule results and permissions are composed into auditable, token-budgeted context packages for your LLMs.',
  },
] as const

/**
 * Three-step flow with a connecting rail.
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-muted/30 scroll-mt-20 border-y py-20 lg:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-primary text-sm font-semibold">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            From raw knowledge to grounded AI context
          </h2>
        </div>

        <ol className="relative mt-14 grid gap-10 lg:grid-cols-3 lg:gap-8">
          <div
            className="absolute top-6 right-[16%] left-[16%] hidden border-t border-dashed lg:block"
            aria-hidden="true"
          />
          {STEPS.map((item) => (
            <li key={item.step} className="relative flex flex-col items-center gap-4 text-center">
              <div className="bg-background border-border flex size-12 items-center justify-center rounded-full border shadow-sm">
                <item.icon className="text-primary size-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                  Step {item.step}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
                <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
