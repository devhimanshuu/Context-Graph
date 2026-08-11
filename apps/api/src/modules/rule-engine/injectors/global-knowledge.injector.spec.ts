import { describe, expect, it, vi } from 'vitest'
import { GlobalKnowledgeInjector, NoopGlobalKnowledgeProvider } from './global-knowledge.injector'
import { makeNode, makeRuleContext } from '../testing/rule-engine-fixtures'
import { InclusionReason } from '../domain/inclusion-reason'
import type { RuleCandidateNode } from '../domain/candidate-node'

function makeProvider(nodes: RuleCandidateNode[]) {
  return { findGlobalNodes: vi.fn(async () => nodes) }
}

describe('GlobalKnowledgeInjector', () => {
  it('keeps the input set unchanged when the provider supplies nothing', async () => {
    const injector = new GlobalKnowledgeInjector(new NoopGlobalKnowledgeProvider())
    const context = makeRuleContext()
    const input = [makeNode({ id: 'a' }), makeNode({ id: 'b' })]

    const result = await injector.inject(context, input)
    expect(result.map((node) => node.id)).toEqual(['a', 'b'])
    expect(
      result.every((node) => node.inclusionReason === InclusionReason.LOCAL_REACHABILITY),
    ).toBe(true)
  })

  it('appends provider-supplied global nodes with GLOBAL_POLICY reason', async () => {
    const injector = new GlobalKnowledgeInjector(
      makeProvider([makeNode({ id: 'g1', title: 'Global policy' })]),
    )
    const context = makeRuleContext()

    const result = await injector.inject(context, [makeNode({ id: 'a' })])
    expect(result.map((node) => node.id)).toEqual(['a', 'g1'])
    expect(result[1]?.inclusionReason).toBe(InclusionReason.GLOBAL_POLICY)
  })

  it('does not duplicate a global node already in the input (first occurrence wins)', async () => {
    const injector = new GlobalKnowledgeInjector(makeProvider([makeNode({ id: 'g1' })]))
    const result = await injector.inject(makeRuleContext(), [
      makeNode({ id: 'g1', title: 'Original' }),
      makeNode({ id: 'a' }),
    ])
    expect(result.map((node) => node.id)).toEqual(['g1', 'a'])
    expect(result[0]?.title).toBe('Original')
    expect(result[0]?.inclusionReason).toBe(InclusionReason.LOCAL_REACHABILITY)
  })

  it('merges multiple global nodes in provider order', async () => {
    const injector = new GlobalKnowledgeInjector(
      makeProvider([makeNode({ id: 'g1' }), makeNode({ id: 'g2' }), makeNode({ id: 'g3' })]),
    )
    const result = await injector.inject(makeRuleContext(), [makeNode({ id: 'a' })])
    expect(result.map((node) => node.id)).toEqual(['a', 'g1', 'g2', 'g3'])
  })

  it('removes duplicate ids WITHIN the input deterministically (first wins)', async () => {
    const injector = new GlobalKnowledgeInjector(new NoopGlobalKnowledgeProvider())
    const result = await injector.inject(makeRuleContext(), [
      makeNode({ id: 'dup', title: 'First' }),
      makeNode({ id: 'dup', title: 'Second' }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.title).toBe('First')
  })
})
