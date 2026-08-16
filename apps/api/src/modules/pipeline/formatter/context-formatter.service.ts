import { Injectable } from '@nestjs/common'
import type {
  ContextPackage,
  ContextPackageCandidate,
} from '../contracts/context-pipeline.contracts'
import { CompressionHint } from '../../candidate/domain/compression-hint'
import { estimateTokens } from '../context-assembly/context-token-budget'
import {
  IContextFormatter,
  type ContextFormatOptions,
  type FormattedContextDocument,
  type FormattedContextSection,
} from './context-formatter.contracts'

/**
 * Deterministic content shaping budgets (in characters, ~4 chars/token).
 * Values are documented constants — the formatter's output is stable.
 */
const SUMMARY_MAX_CHARS = 280
const COMPRESSED_MAX_CHARS = 140
const REFERENCE_ONLY_MAX_CHARS = 80
/** Ellipsis appended when content is shortened. */
const TRUNCATION_MARK = '…'

/** Renders the content of one candidate according to its compression hint. */
function renderContent(candidate: ContextPackageCandidate): {
  content: string
  truncated: boolean
} {
  const content = candidate.content.trim()
  switch (candidate.compressionHint) {
    case CompressionHint.FULL:
      // The entry node anchors the package: content verbatim, never cut.
      return { content, truncated: false }
    case CompressionHint.SUMMARY:
      return truncateWords(content, SUMMARY_MAX_CHARS)
    case CompressionHint.COMPRESSED:
      return truncateWords(content, COMPRESSED_MAX_CHARS)
    case CompressionHint.REFERENCE_ONLY:
      // Generic/derivable content stays out of context — a bare reference.
      return {
        content: truncateWords(
          `${candidate.title} [${candidate.candidateId}]`,
          REFERENCE_ONLY_MAX_CHARS,
        ).content,
        truncated: true,
      }
  }
}

/** Shortens text to a character budget at the last safe word boundary. */
function truncateWords(text: string, maxChars: number): { content: string; truncated: boolean } {
  if (text.length <= maxChars) return { content: text, truncated: false }
  let cut = text.slice(0, maxChars)
  const boundary = cut.lastIndexOf(' ')
  if (boundary > 0) cut = cut.slice(0, boundary)
  return { content: `${cut}${TRUNCATION_MARK}`, truncated: true }
}

/** Renders the compact per-candidate metadata line (no content). */
function renderMetadataLine(candidate: ContextPackageCandidate): string {
  const tags =
    candidate.complianceTags.length > 0 ? ` · tags: ${candidate.complianceTags.join(',')}` : ''
  return (
    `(${candidate.type} · importance ${candidate.importance} · distance ${candidate.distance}` +
    ` · ${candidate.inclusionReason} · hint ${candidate.compressionHint}${tags})`
  )
}

/** Renders the optional exclusion notes block (rule/budget/rank cuts). */
function renderExclusions(pkg: ContextPackage): string {
  if (pkg.exclusions.length === 0) return ''
  const lines = pkg.exclusions.map((exclusion) => {
    const reason =
      exclusion.finalReasonCode ??
      (exclusion.excludedByBudget
        ? 'budget-cut'
        : exclusion.excludedByRank === true
          ? 'rank-cut'
          : 'excluded')
    return `- ${exclusion.nodeId} — excluded (${reason}${exclusion.failingRuleId ? `, rule ${exclusion.failingRuleId}` : ''})`
  })
  return `\n--- Excluded (${pkg.exclusions.length}) ---\n${lines.join('\n')}\n`
}

/**
 * Deterministic, provider-independent rendering of a ContextPackage into a
 * prompt-ready document.
 *
 * The renderer applies each candidate's compression hint (FULL / SUMMARY /
 * COMPRESSED / REFERENCE_ONLY) to shape how much content enters the prompt,
 * then assembles a plain-text document with a metadata header and one
 * section per ranked candidate. No LLM is ever called here — the output is
 * the input to a future ILLMAdapter. Identical packages format byte-
 * identically.
 */
@Injectable()
export class ContextFormatter implements IContextFormatter {
  format(pkg: ContextPackage, options: ContextFormatOptions = {}): FormattedContextDocument {
    const sections: FormattedContextSection[] = []
    let contentTokens = 0

    for (const candidate of pkg.candidates) {
      const rendered = renderContent(candidate)
      const body = `${renderMetadataLine(candidate)}\n${rendered.content}`
      const tokens = estimateTokens(body)
      contentTokens += tokens
      sections.push({
        candidateId: candidate.candidateId,
        rank: candidate.rank,
        title: candidate.title,
        body: rendered.content,
        compressionHint: candidate.compressionHint,
        tokens,
        truncated: rendered.truncated,
      })
    }

    const exclusionsBlock = options.includeExclusions === true ? renderExclusions(pkg) : ''
    const header = [
      `# ContextGraph Context Package (${pkg.version})`,
      `requestId: ${pkg.requestId}`,
      `packageId: ${pkg.packageId}`,
      `workspaceId: ${pkg.workspaceId}`,
      `entryNodeId: ${pkg.entryNodeId}`,
      `mode: ${pkg.mode}`,
      `evaluatedAt: ${pkg.evaluatedAt}`,
      `candidates: ${pkg.candidates.length}`,
    ].join('\n')
    const renderedSections = sections
      .map((section) => `\n---\n## ${section.rank}. ${section.title}\n${section.body}`)
      .join('')
    const text = `${header}${renderedSections}${exclusionsBlock}\n`

    return {
      text,
      sections,
      tokens: estimateTokens(text),
      contentTokens,
      requestId: pkg.requestId,
      packageId: pkg.packageId,
      version: pkg.version,
      workspaceId: pkg.workspaceId,
      entryNodeId: pkg.entryNodeId,
      candidateCount: pkg.candidates.length,
      truncated: sections.some((section) => section.truncated),
    }
  }
}
