import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import type { AssembledContext } from '../domain/ai.types'
import type { BuiltPrompt } from '../domain/ai.interfaces'
import type { IContextHasher } from '../domain/ai.interfaces'

/**
 * Context Hasher — creates deterministic hashes.
 *
 * Used for:
 * - Debugging: identify exact context version
 * - Caching: avoid regenerating identical prompts
 * - Audit: track context lineage
 * - Reproducibility: verify identical inputs produce identical outputs
 *
 * Hashing strategy:
 * - Context: version + ordered candidate IDs + ranks
 * - Prompt: system prompt + user prompt + context hash
 *
 * Does NOT hash secrets or sensitive content.
 */
@Injectable()
export class ContextHasher implements IContextHasher {
  hashContext(context: AssembledContext): string {
    const hasher = crypto.createHash('sha256')

    // Hash context version
    hasher.update(context.contextVersion)

    // Hash ordered candidate IDs and ranks
    for (const item of context.items) {
      hasher.update(item.id)
      hasher.update(String(item.rank))
    }

    // Hash entry node and workspace
    hasher.update(context.entryNodeId)
    hasher.update(context.workspaceId)

    return hasher.digest('hex').slice(0, 16)
  }

  hashPrompt(prompt: BuiltPrompt): string {
    const hasher = crypto.createHash('sha256')

    // Hash system prompt
    hasher.update(prompt.systemPrompt)

    // Hash user prompt
    hasher.update(prompt.userPrompt)

    // Hash prompt version
    hasher.update(prompt.promptVersion)

    return hasher.digest('hex').slice(0, 16)
  }
}
