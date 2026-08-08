'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/* Shared "pipeline clock" for the hero's live demo. Advances a single stage */
export const PIPELINE_STAGES = ['traversal', 'rules', 'permissions', 'assembly', 'ready'] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

const CYCLE_MS = 3200

/* A pin freezes the demo. Stages pin from the tour tabs; nodes pin from a */
export type PipelinePin = { type: 'stage'; index: number } | { type: 'node'; index: number }

interface PipelineStoryValue {
  /** Current 0-based stage index. */
  stageIndex: number
  /** Current stage id. */
  stage: PipelineStage
  /** True on the final, completed stage. */
  isReady: boolean
  /** Active pin (tab stage or explored node); null = auto-cycling. */
  pin: PipelinePin | null
  /** Freeze the demo on a tour stage. */
  pinStage: (index: number) => void
  /** Freeze the demo and explore a node's neighborhood. */
  pinNode: (index: number) => void
  /** Clear any pin and resume the auto-cycle. */
  resume: () => void
}

const PipelineStoryContext = createContext<PipelineStoryValue | null>(null)

export function PipelineStory({ children }: { children: ReactNode }) {
  const [stageIndex, setStageIndex] = useState(0)
  const [pin, setPin] = useState<PipelinePin | null>(null)
  const [hidden, setHidden] = useState(false)
  const stageRef = useRef(0)

  // Track the live stage so a node pin can freeze wherever the demo was.
  useEffect(() => {
    stageRef.current = stageIndex
  }, [stageIndex])

  // Track tab visibility so the demo clock pauses when the page is hidden.
  useEffect(() => {
    const onVisibilityChange = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    // Manual control wins: freeze the stage wherever the caller points it.
    if (pin !== null) {
      setStageIndex(pin.type === 'stage' ? pin.index : stageRef.current)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStageIndex(PIPELINE_STAGES.length - 1)
      return
    }
    if (hidden) return

    const id = window.setInterval(
      () => setStageIndex((i) => (i + 1) % PIPELINE_STAGES.length),
      CYCLE_MS,
    )
    return () => window.clearInterval(id)
  }, [hidden, pin])

  const isReady = stageIndex === PIPELINE_STAGES.length - 1

  // Memoize so consumers only re-render when the stage actually advances
  // (not on tab-visibility toggles).
  const value = useMemo(
    () => ({
      stageIndex,
      stage: PIPELINE_STAGES[stageIndex],
      isReady,
      pin,
      pinStage: (index: number) => setPin({ type: 'stage', index }),
      pinNode: (index: number) => setPin({ type: 'node', index }),
      resume: () => setPin(null),
    }),
    [stageIndex, isReady, pin],
  )

  return <PipelineStoryContext.Provider value={value}>{children}</PipelineStoryContext.Provider>
}

export function usePipelineStory(): PipelineStoryValue {
  const value = useContext(PipelineStoryContext)
  if (!value) throw new Error('usePipelineStory must be used within <PipelineStory>')
  return value
}
