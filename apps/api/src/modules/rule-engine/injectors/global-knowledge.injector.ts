import { Inject, Injectable } from '@nestjs/common'
import type { RuleCandidateNode } from '../domain/candidate-node'
import { InclusionReason } from '../domain/inclusion-reason'
import type { RuleExecutionContext } from '../domain/rule-context'

/**
 * Source of globally relevant nodes — organization-wide safety policies,
 * compliance rules, critical constraints. Swappable via DI: the default
 * binding supplies nothing (the input set is already the authorized set);
 * future bindings may load global policies from a store, cache or event feed.
 */
export abstract class IGlobalKnowledgeProvider {
  abstract findGlobalNodes(context: RuleExecutionContext): Promise<readonly RuleCandidateNode[]>
}

/** Default binding: no external global knowledge. */
@Injectable()
export class NoopGlobalKnowledgeProvider extends IGlobalKnowledgeProvider {
  async findGlobalNodes(): Promise<readonly RuleCandidateNode[]> {
    return []
  }
}

/**
 * Merges globally relevant knowledge into the candidate set:
 *
 *   1. input nodes are kept as-is (including nodes flagged `isGlobal` via
 *      metadata — they are already reachable/authorized);
 *   2. provider-supplied nodes are appended with `inclusionReason =
 *      GLOBAL_POLICY`, deduplicated by id (first occurrence wins);
 *   3. deterministic order: input order, then provider order.
 */
export abstract class IGlobalKnowledgeInjector {
  abstract inject(
    context: RuleExecutionContext,
    nodes: readonly RuleCandidateNode[],
  ): Promise<readonly RuleCandidateNode[]>
}

@Injectable()
export class GlobalKnowledgeInjector extends IGlobalKnowledgeInjector {
  constructor(
    @Inject(IGlobalKnowledgeProvider)
    private readonly provider: IGlobalKnowledgeProvider,
  ) {
    super()
  }

  async inject(
    context: RuleExecutionContext,
    nodes: readonly RuleCandidateNode[],
  ): Promise<readonly RuleCandidateNode[]> {
    // First occurrence wins (deterministic) — a Map built from the array would
    // keep the LAST duplicate instead.
    const byId = new Map<string, RuleCandidateNode>()
    for (const node of nodes) {
      if (byId.has(node.id)) continue
      byId.set(node.id, node)
    }

    const provided = await this.provider.findGlobalNodes(context)
    for (const global of provided) {
      if (byId.has(global.id)) continue
      byId.set(global.id, {
        ...global,
        inclusionReason: InclusionReason.GLOBAL_POLICY,
      })
    }

    return [...byId.values()]
  }
}
