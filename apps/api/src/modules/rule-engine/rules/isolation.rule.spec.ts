import { describe, expect, it } from 'vitest'
import { IsolationRule } from './isolation.rule'
import { makeDefinition, makeNode, makeRuleContext } from '../testing/rule-engine-fixtures'
import { ORG_A, ORG_B } from '../../authorization/testing/authorization-fixtures'
import { RULE_ID } from '../configuration/rule-ids'

function makeRule() {
  return new IsolationRule(makeDefinition({ id: RULE_ID.ISOLATION }))
}

describe('IsolationRule', () => {
  it('passes a node of the same organization', () => {
    const result = makeRule().evaluate(makeRuleContext(), makeNode({ organizationId: ORG_A }))
    expect(result.passed).toBe(true)
    expect(result.reasonCode).toBe('PASS')
  })

  it('fails a node of another organization with ORG_MISMATCH', () => {
    const result = makeRule().evaluate(makeRuleContext(), makeNode({ organizationId: ORG_B }))
    expect(result.passed).toBe(false)
    expect(result.reasonCode).toBe('ORG_MISMATCH')
    expect(result.metadata).toMatchObject({
      nodeOrganizationId: ORG_B,
      contextOrganizationId: ORG_A,
    })
  })

  it('fails a node with a missing organization identifier (fail closed)', () => {
    const result = makeRule().evaluate(makeRuleContext(), makeNode({ organizationId: '' as never }))
    expect(result.passed).toBe(false)
    expect(result.reasonCode).toBe('ORG_MISMATCH')
  })

  it('is deterministic across calls', () => {
    const rule = makeRule()
    const context = makeRuleContext()
    const node = makeNode({ organizationId: ORG_B })
    const first = rule.evaluate(context, node)
    const second = rule.evaluate(context, node)
    expect(first).toEqual(second)
  })

  it('records the evaluation instant from the context', () => {
    const context = makeRuleContext()
    const result = makeRule().evaluate(context, makeNode())
    expect(result.evaluatedAt).toBe(context.evaluatedAt)
  })
})
