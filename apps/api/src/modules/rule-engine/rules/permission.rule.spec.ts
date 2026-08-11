import { describe, expect, it, vi } from 'vitest'
import { ComplianceTag } from '@contextgraph/types'
import { PermissionRule } from './permission.rule'
import {
  makeDefinition,
  makeEvaluator,
  makeNode,
  makeRuleContext,
} from '../testing/rule-engine-fixtures'
import { RULE_ID } from '../configuration/rule-ids'
import { ORG_B } from '../../authorization/testing/authorization-fixtures'
import type { IAuthorizationEvaluator } from '../../authorization/evaluator/permission-evaluator'
import { PermissionAction } from '@contextgraph/types'

function makeRule(evaluator: IAuthorizationEvaluator = makeEvaluator()) {
  return new PermissionRule(makeDefinition({ id: RULE_ID.PERMISSION }), evaluator)
}

describe('PermissionRule', () => {
  it('passes a node the authorization engine allows', () => {
    const result = makeRule().evaluate(makeRuleContext(), makeNode())
    expect(result.passed).toBe(true)
    expect(result.reasonCode).toBe('PASS')
  })

  it('fails a node the authorization engine denies (INSUFFICIENT_PERMISSION)', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ complianceTags: [ComplianceTag.RESTRICTED] }),
    )
    expect(result.passed).toBe(false)
    expect(result.reasonCode).toBe('INSUFFICIENT_PERMISSION')
    expect(result.metadata?.failedPolicy).toBe('COMPLIANCE')
  })

  it('denies a node of another organization (delegates to the engine, no re-implementation)', () => {
    const result = makeRule().evaluate(makeRuleContext(), makeNode({ organizationId: ORG_B }))
    expect(result.passed).toBe(false)
    expect(result.metadata?.failedPolicy).toBe('ORGANIZATION')
  })

  it('delegates every check to the evaluator with the READ action', () => {
    const evaluator = {
      evaluate: vi.fn(() => ({ allowed: true })),
    } as unknown as IAuthorizationEvaluator
    const result = makeRule(evaluator).evaluate(makeRuleContext(), makeNode())
    expect(evaluator.evaluate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'node-1', resourceType: 'knowledge-node' }),
      PermissionAction.READ,
    )
    expect(result.passed).toBe(true)
  })

  it('uses the compiled context from the execution context, never the user claims', () => {
    const evaluator = {
      evaluate: vi.fn(() => ({ allowed: false, reason: 'x', failedPolicy: 'Y' })),
    } as unknown as IAuthorizationEvaluator
    const context = makeRuleContext()
    const result = makeRule(evaluator).evaluate(context, makeNode())
    expect(evaluator.evaluate).toHaveBeenCalledWith(
      context.authorization,
      expect.anything(),
      expect.anything(),
    )
    expect(result.passed).toBe(false)
  })

  it('maps visibility from metadata (PRIVATE node not owned → denied)', () => {
    const result = makeRule().evaluate(
      makeRuleContext(),
      makeNode({ metadata: { visibility: 'PRIVATE' }, ownerId: 'someone-else' }),
    )
    expect(result.passed).toBe(false)
    expect(result.metadata?.failedPolicy).toBe('VISIBILITY')
  })

  it('passes a PRIVATE node the caller owns', () => {
    const context = makeRuleContext()
    const result = makeRule().evaluate(
      context,
      makeNode({ metadata: { visibility: 'PRIVATE' }, ownerId: context.authorization.userId }),
    )
    expect(result.passed).toBe(true)
  })
})
