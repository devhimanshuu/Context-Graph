const LAYERS = [
  {
    name: 'Presentation',
    detail: 'Dashboard shell · React 19 · shadcn/ui',
    tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  },
  {
    name: 'HTTP boundary',
    detail: 'Route handlers · uniform API envelope',
    tone: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
  {
    name: 'Controllers',
    detail: 'Thin orchestration · validation → service → DTO',
    tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },
  {
    name: 'Services',
    detail: 'Business logic behind interfaces',
    tone: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20',
  },
  {
    name: 'Repositories',
    detail: 'The only layer that talks to the database',
    tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  {
    name: 'Data',
    detail: 'PostgreSQL · Prisma · multi-tenant schema',
    tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
] as const

/**
 * Stacked, color-coded layer diagram of the architecture.
 */
export function ArchitectureSection() {
  return (
    <section id="architecture" className="scroll-mt-20 py-20 lg:py-24">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 md:px-6 lg:grid-cols-2">
        <div>
          <p className="text-primary text-sm font-semibold">Architecture</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Clean layering that survives years of teams
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg leading-relaxed">
            Feature-first and clean-architecture: dependency inversion keeps business logic
            decoupled from the framework and the data store. Engines land as generic modules on
            stable contracts — never as framework-specific monoliths.
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            {[
              'Domain-agnostic core (no vendor lock-in)',
              'Repository pattern isolates Prisma/Supabase',
              'Centralized errors, logging and config',
              'Testable interfaces at every seam',
            ].map((point) => (
              <li key={point} className="text-muted-foreground flex items-start gap-2">
                <span
                  className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full"
                  aria-hidden="true"
                />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2" aria-label="Architecture layers">
          {LAYERS.map((layer, index) => (
            <div
              key={layer.name}
              className={`flex items-center justify-between gap-4 rounded-xl border px-5 py-3.5 transition-transform duration-200 hover:translate-x-1 ${layer.tone}`}
            >
              <div>
                <p className="text-sm font-semibold">{layer.name}</p>
                <p className="text-muted-foreground text-xs">{layer.detail}</p>
              </div>
              <span className="text-muted-foreground/60 font-mono text-xs">{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
