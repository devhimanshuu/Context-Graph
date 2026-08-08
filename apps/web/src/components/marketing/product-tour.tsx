'use client'

import {
  Pause,
  Play,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PipelineStory, usePipelineStory } from './pipeline-story'
import { PipelinePanel } from './pipeline-panel'
import { Reveal } from './reveal'

interface TourTab {
  id: string
  stageIndex: number
  icon: LucideIcon
  title: string
  caption: string
}

const TOUR_TABS: readonly TourTab[] = [
  {
    id: 'graph',
    stageIndex: 0,
    icon: Waypoints,
    title: 'Typed knowledge, connected',
    caption:
      'Facts, constraints and decisions live as typed nodes and edges — traversed deterministically from any entry point.',
  },
  {
    id: 'rules',
    stageIndex: 1,
    icon: ScrollText,
    title: 'Rules that never guess',
    caption:
      'Versioned, declarative rules evaluate in priority order — dry-runnable, explainable and fully auditable.',
  },
  {
    id: 'permissions',
    stageIndex: 2,
    icon: ShieldCheck,
    title: 'Filtered before assembly',
    caption:
      'Roles, permission profiles and compliance clearance gate every read before a single token is assembled.',
  },
  {
    id: 'assembly',
    stageIndex: 3,
    icon: Sparkles,
    title: 'Context your LLM can trust',
    caption:
      'Traversal output, rule results and permissions compose into token-budgeted context packages.',
  },
]

/* Live product tour: the active tab follows the pipeline as it cycles. Clicking */
export function ProductTour() {
  return (
    <section
      id="product-tour"
      className="relative scroll-mt-20 overflow-hidden border-t py-20 lg:py-24"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-1/4 -right-40 h-96 w-96 rounded-full bg-fuchsia-500/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
            ▸ Product tour
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            See how context is assembled — live
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Watch the pipeline work in real time: the graph lights up, rules evaluate, permissions
            gate, and a token-budgeted context package lands in your LLM.
          </p>
        </Reveal>

        <PipelineStory>
          <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
            <Reveal direction="left" className="flex justify-center lg:justify-end">
              <PipelinePanel />
            </Reveal>

            <TourTabs />
          </div>
        </PipelineStory>
      </div>
    </section>
  )
}

function TourTabs() {
  const { stageIndex, pin, pinStage, resume } = usePipelineStory()
  const following = pin === null
  // Ready (last stage) falls back to the assembly tab.
  const activeStage = pin?.type === 'stage' ? pin.index : stageIndex
  const activeTab =
    TOUR_TABS.find((tab) => tab.stageIndex === activeStage) ?? TOUR_TABS[TOUR_TABS.length - 1]

  return (
    <Reveal direction="right" className="flex flex-col">
      {/* Toolbar: live status pill or pause/resume control */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.25em] uppercase">
          Pipeline stages
        </p>
        {following ? (
          <button
            type="button"
            aria-label="Pause live demo"
            onClick={() => pinStage(stageIndex)}
            className="text-muted-foreground/70 hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
          >
            <Pause className="size-3" />
            Live
          </button>
        ) : (
          <button
            type="button"
            onClick={resume}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 px-2.5 py-1 font-mono text-[10px] tracking-[0.2em] text-emerald-500 uppercase transition-colors hover:bg-emerald-500/10"
          >
            <Play className="size-3" />
            Follow live
          </button>
        )}
      </div>

      <div role="tablist" aria-label="Product tour stages" className="space-y-3">
        {TOUR_TABS.map((tab) => {
          const isActive = activeTab.id === tab.id
          // The pipeline is animating on this tab right now (follow mode only).
          const isLive = following && stageIndex === tab.stageIndex
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tour-panel-${tab.id}`}
              onClick={() =>
                pin?.type === 'stage' && pin.index === tab.stageIndex
                  ? resume()
                  : pinStage(tab.stageIndex)
              }
              className={cn(
                'group flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all duration-300',
                isActive
                  ? 'hover:border-primary/40 border-primary/40 bg-background shadow-[0_16px_40px_-20px_rgba(var(--cg-glow),0.4)]'
                  : 'border-border/60 bg-background/40 hover:border-primary/25',
              )}
            >
              <span
                className={cn(
                  'relative flex size-10 shrink-0 items-center justify-center rounded-lg border transition-colors duration-300',
                  isActive
                    ? 'text-primary border-transparent bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20'
                    : 'text-muted-foreground',
                )}
              >
                {/* Breathing halo ring around the icon while its stage is live */}
                {isLive && (
                  <span
                    className="animate-cg-halo pointer-events-none absolute -inset-1.5 rounded-xl border border-sky-400/40"
                    aria-hidden="true"
                  />
                )}
                <tab.icon
                  className={cn(
                    'size-5 transition-transform duration-300',
                    isLive && 'animate-cg-pulse',
                  )}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'flex items-center gap-2 text-sm font-semibold tracking-tight',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {tab.title}
                  {isLive && (
                    <span className="text-[10px] font-medium tracking-wide text-emerald-500 uppercase">
                      ● live
                    </span>
                  )}
                </span>
                {/* Keyed remount replays the caption entrance on each stage change */}
                <span
                  key={`${tab.id}-${isActive ? activeStage : 'idle'}`}
                  className={cn(
                    'text-muted-foreground mt-1 block text-sm leading-relaxed',
                    isActive && 'cg-status-in',
                  )}
                >
                  {tab.caption}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </Reveal>
  )
}
