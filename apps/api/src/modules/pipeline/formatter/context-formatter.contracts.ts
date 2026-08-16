import type { ContextPackage } from '../contracts/context-pipeline.contracts'

/** Rendering option: include the exclusion notes section in the prompt. */
export interface ContextFormatOptions {
  /** Render the excluded-node notes block (default false). */
  readonly includeExclusions?: boolean
}

/** One rendered context section — the unit of the assembled prompt. */
export interface FormattedContextSection {
  readonly candidateId: string
  readonly rank: number
  readonly title: string
  /** The content rendered according to the candidate's compression hint. */
  readonly body: string
  readonly compressionHint: string
  /** Estimated tokens of this section's rendered body. */
  readonly tokens: number
  /** True when the compression hint required the content to be shortened. */
  readonly truncated: boolean
}

/**
 * The provider-independent, prompt-ready rendering of a ContextPackage.
 * Deterministic: identical packages format byte-identically.
 */
export interface FormattedContextDocument {
  /** The assembled document — safe to pass to any LLM adapter verbatim. */
  readonly text: string
  readonly sections: readonly FormattedContextSection[]
  /** Estimated tokens of the full document (deterministic heuristic). */
  readonly tokens: number
  /** Estimated tokens of the candidate sections only (not the header). */
  readonly contentTokens: number
  readonly requestId: string
  readonly packageId: string
  readonly version: string
  readonly workspaceId: string
  readonly entryNodeId: string
  readonly candidateCount: number
  /** True when at least one section's content was shortened. */
  readonly truncated: boolean
}

/** The deterministic formatter seam: ContextPackage → prompt-ready document. */
export abstract class IContextFormatter {
  abstract format(pkg: ContextPackage, options?: ContextFormatOptions): FormattedContextDocument
}
