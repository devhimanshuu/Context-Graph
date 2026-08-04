import {
  Boxes,
  Building2,
  FileCheck2,
  ScrollText,
  ShieldCheck,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Reveal } from './reveal'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const FEATURES: readonly Feature[] = [
  {
    icon: Waypoints,
    title: 'Knowledge graph traversal',
    description:
      'Model facts, constraints, decisions and anti-patterns as typed nodes and edges, traversed with deterministic BFS reachability.',
  },
  {
    icon: ScrollText,
    title: 'Deterministic rule engine',
    description:
      'Versioned, declarative rules with JSON conditions — auditable, dry-runnable, and evaluated in priority order.',
  },
  {
    icon: ShieldCheck,
    title: 'Permission-aware filtering',
    description:
      'Roles, permission profiles and compliance clearance filter every query before a single token is assembled.',
  },
  {
    icon: Boxes,
    title: 'Context assembly for AI',
    description:
      'Combine traversal output, rule evaluations and permissions into token-budgeted context packages for LLMs.',
  },
  {
    icon: Building2,
    title: 'Multi-tenant by construction',
    description:
      'Every row anchors to an organization; isolation is a query-plan property, not a convention teams must remember.',
  },
  {
    icon: FileCheck2,
    title: 'Audit & compliance',
    description:
      'Append-only event log with before/after snapshots, validity windows and regulatory tags out of the box.',
  },
]

/**
 * Core capability grid. Cards lift on hover with a subtle arrow reveal.
 */
export function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-20 border-t py-20 lg:py-24">
      <div className="mx-auto w-full max-w-full px-4 md:px-8 lg:px-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
            Platform
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Everything an enterprise context platform needs
          </h2>
          <p className="text-muted-foreground mt-3 text-base">
            Domain-agnostic engines on a clean, layered core — ready for healthcare, finance, legal
            and beyond.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Reveal
              key={feature.title}
              delay={(index % 3) * 90 + Math.floor(index / 3) * 70}
              className="h-full"
            >
              <Card className="group h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <CardHeader>
                  <div className="bg-primary/5 text-primary flex size-10 items-center justify-center rounded-lg border">
                    <feature.icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
