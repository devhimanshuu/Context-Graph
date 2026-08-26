'use client'

import { useState } from 'react'
import {
  Boxes,
  Database,
  FileOutput,
  GitBranch,
  KeyRound,
  ShieldCheck,
  Waypoints,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'

interface StageNode {
  id: string
  label: string
  sublabel: string
  icon: React.ElementType
  color: string
  glowColor: string
  description: string
}

const STAGES: readonly StageNode[] = [
  {
    id: 'agent',
    label: 'Agent',
    sublabel: 'MCP Client',
    icon: Boxes,
    color: 'text-sky-500',
    glowColor: 'bg-sky-500/20',
    description:
      'AI agent connects via MCP protocol with an authenticated identity and scoped capabilities.',
  },
  {
    id: 'mcp',
    label: 'MCP Server',
    sublabel: 'Governed tools',
    icon: KeyRound,
    color: 'text-amber-500',
    glowColor: 'bg-amber-500/20',
    description:
      '6 governed tools — resolve_context, get_subgraph, check_action, propose_node, get_run, replay_run.',
  },
  {
    id: 'graph',
    label: 'Graph Traversal',
    sublabel: 'BFS reachability',
    icon: Waypoints,
    color: 'text-violet-500',
    glowColor: 'bg-violet-500/20',
    description:
      'Deterministic BFS from entry node through typed edges — facts, constraints, decisions, anti-patterns.',
  },
  {
    id: 'rules',
    label: 'Rule Engine',
    sublabel: 'Deterministic',
    icon: Database,
    color: 'text-emerald-500',
    glowColor: 'bg-emerald-500/20',
    description:
      'Versioned declarative rules with JSON conditions, evaluated in priority order — dry-runnable and auditable.',
  },
  {
    id: 'permissions',
    label: 'Permissions',
    sublabel: 'RBAC + compliance',
    icon: ShieldCheck,
    color: 'text-rose-500',
    glowColor: 'bg-rose-500/20',
    description:
      'Role, permission level and compliance clearance gate every read — filtered at the query layer.',
  },
  {
    id: 'assembly',
    label: 'Context Assembly',
    sublabel: 'Token-budgeted',
    icon: GitBranch,
    color: 'text-indigo-500',
    glowColor: 'bg-indigo-500/20',
    description:
      'Traversal output, rule results and permissions compose into auditable, token-budgeted context packages.',
  },
  {
    id: 'output',
    label: 'Context Package',
    sublabel: 'Authorized output',
    icon: FileOutput,
    color: 'text-fuchsia-500',
    glowColor: 'bg-fuchsia-500/20',
    description:
      'Ranked, permission-filtered, rule-checked context with full provenance and citation metadata.',
  },
]

/**
 * Interactive architecture diagram — hover/click any stage to see details.
 * Animated flow indicators show data moving through the pipeline.
 */
export function ArchitectureDiagram() {
  const [activeStage, setActiveStage] = useState<string | null>(null)
  const active = STAGES.find((s) => s.id === activeStage)

  return (
    <section
      id="architecture"
      className="bg-muted/30 relative scroll-mt-20 overflow-hidden border-y py-20 lg:py-24"
    >
      <div className="cg-grid-bg absolute inset-0 opacity-40" aria-hidden="true" />

      <div className="relative mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h3 className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
            Architecture
          </h3>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            How ContextGraph works
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Every context decision flows through a deterministic pipeline — graph traversal, rule
            evaluation, permission filtering, and auditable assembly.
          </p>
        </Reveal>

        {/* Desktop: horizontal flow diagram */}
        <Reveal delay={100} className="mt-14 hidden lg:block">
          <div className="relative mx-auto max-w-6xl">
            {/* Flow arrows between nodes */}
            <div className="absolute top-1/2 right-0 left-0 -translate-y-1/2" aria-hidden="true">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-8">
                {STAGES.slice(0, -1).map((_, i) => (
                  <div key={i} className="flex items-center">
                    <div className="from-border to-border/60 h-px w-8 bg-gradient-to-r" />
                    <svg className="text-primary/40 size-3" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M2 1l8 5-8 5V1z" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage nodes */}
            <div className="relative grid grid-cols-7 gap-2">
              {STAGES.map((stage, index) => {
                const isActive = activeStage === stage.id
                const Icon = stage.icon
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setActiveStage(isActive ? null : stage.id)}
                    onMouseEnter={() => setActiveStage(stage.id)}
                    onMouseLeave={() => setActiveStage(null)}
                    className={cn(
                      'group relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all duration-300',
                      isActive
                        ? 'border-primary/40 bg-background shadow-lg'
                        : 'border-border/60 bg-background/60 hover:border-primary/25 hover:bg-background/80',
                    )}
                  >
                    {/* Glow behind icon */}
                    <div
                      className={cn(
                        'absolute -inset-1 rounded-xl opacity-0 blur-md transition-opacity duration-300',
                        stage.glowColor,
                        isActive && 'opacity-100',
                      )}
                      aria-hidden="true"
                    />

                    <div
                      className={cn(
                        'relative flex size-10 items-center justify-center rounded-lg border transition-all duration-300',
                        isActive
                          ? 'scale-110 border-transparent bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20'
                          : 'border-border/60 bg-background/80 group-hover:scale-105',
                      )}
                    >
                      <Icon className={cn('size-5 transition-colors', stage.color)} />
                    </div>

                    <div className="relative">
                      <p className="text-xs leading-tight font-semibold tracking-tight">
                        {stage.label}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-[10px] leading-tight">
                        {stage.sublabel}
                      </p>
                    </div>

                    {/* Step number */}
                    <span className="text-muted-foreground/40 font-mono text-[9px]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div className="mx-auto mt-6 max-w-3xl">
            <div
              className={cn(
                'bg-background/80 rounded-xl border p-5 transition-all duration-300',
                active ? 'border-primary/30 opacity-100' : 'border-border/40 opacity-60',
              )}
            >
              {active ? (
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10',
                    )}
                  >
                    <active.icon className={cn('size-5', active.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">{active.label}</p>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {active.description}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  Hover over any stage to learn how it works.
                </p>
              )}
            </div>
          </div>
        </Reveal>

        {/* Mobile: vertical flow */}
        <Reveal delay={100} className="mt-12 lg:hidden">
          <div className="relative mx-auto max-w-md space-y-1">
            {STAGES.map((stage, index) => {
              const Icon = stage.icon
              return (
                <div key={stage.id} className="flex items-start gap-3">
                  {/* Vertical connector */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-lg border transition-all duration-300',
                        'border-border/60 bg-background/80',
                      )}
                    >
                      <Icon className={cn('size-5', stage.color)} />
                    </div>
                    {index < STAGES.length - 1 && (
                      <div className="border-border/40 w-px flex-1 border-l border-dashed" />
                    )}
                  </div>

                  <div className="pt-1.5 pb-6">
                    <p className="text-sm font-semibold tracking-tight">{stage.label}</p>
                    <p className="text-muted-foreground text-xs">{stage.sublabel}</p>
                    <p className="text-muted-foreground/70 mt-1 text-xs leading-relaxed">
                      {stage.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
