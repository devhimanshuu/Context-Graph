import { describe, expect, it } from 'vitest'
import { GraphValidator } from './graph-validator'
import { CycleDetector } from './cycle-detector'
import { GraphValidationIssueType } from '../domain/validation'
import {
  brokenEdgeGraph,
  cycleGraph,
  cycleWithTailGraph,
  duplicateEdgeGraph,
  fixtureToGraph,
  linearChain,
  makeEdgeEntity,
  makeNodeProjection,
  selfReferenceGraph,
  sharedAncestorGraph,
} from '../testing/graph-fixtures'

const validator = new GraphValidator(new CycleDetector())

describe('GraphValidator', () => {
  it('accepts a valid DAG', () => {
    const fixture = sharedAncestorGraph()
    const result = validator.validate(fixture.nodes, fixture.edges)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts a linear chain', () => {
    const fixture = linearChain(4)
    expect(validator.validate(fixture.nodes, fixture.edges).valid).toBe(true)
  })

  it('rejects a cyclic graph with a CYCLE issue', () => {
    const fixture = cycleGraph()
    const result = validator.validate(fixture.nodes, fixture.edges)
    expect(result.valid).toBe(false)
    const cycleIssue = result.errors.find((error) => error.type === GraphValidationIssueType.CYCLE)
    expect(cycleIssue).toBeDefined()
    expect(cycleIssue?.cycle?.length).toBeGreaterThanOrEqual(2)
  })

  it('rejects a cycle even when an acyclic tail is present', () => {
    const fixture = cycleWithTailGraph()
    expect(validator.validate(fixture.nodes, fixture.edges).valid).toBe(false)
  })

  it('detects self-referencing edges', () => {
    const fixture = selfReferenceGraph()
    const result = validator.validate(fixture.nodes, fixture.edges)
    expect(
      result.errors.some((error) => error.type === GraphValidationIssueType.SELF_REFERENCE),
    ).toBe(true)
  })

  it('detects edges referencing missing nodes', () => {
    const fixture = brokenEdgeGraph()
    const result = validator.validate(fixture.nodes, fixture.edges)
    expect(
      result.errors.some((error) => error.type === GraphValidationIssueType.MISSING_NODE),
    ).toBe(true)
  })

  it('detects duplicate edges', () => {
    const fixture = duplicateEdgeGraph()
    const result = validator.validate(fixture.nodes, fixture.edges)
    const duplicateIssues = result.errors.filter(
      (error) => error.type === GraphValidationIssueType.DUPLICATE_EDGE,
    )
    expect(duplicateIssues).toHaveLength(1)
  })

  it('detects structurally invalid edges (missing endpoints)', () => {
    const result = validator.validate([makeNodeProjection('n0')], [makeEdgeEntity('e1', '', 'n0')])
    expect(
      result.errors.some((error) => error.type === GraphValidationIssueType.INVALID_EDGE),
    ).toBe(true)
  })

  it('validates an already-built graph via validateGraph', () => {
    const fixture = cycleGraph()
    expect(validator.validateGraph(fixtureToGraph(fixture)).valid).toBe(false)
    const valid = fixtureToGraph(sharedAncestorGraph())
    expect(validator.validateGraph(valid).valid).toBe(true)
  })
})
