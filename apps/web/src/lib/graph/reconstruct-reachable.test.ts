import { describe, expect, it } from 'vitest'
import type { GraphEdge } from '@/lib/api/types'
import { reconstructUpwardReachable } from './reconstruct-reachable'

const edge = (sourceId: string, targetId: string, id = `${sourceId}->${targetId}`): GraphEdge => ({
  id,
  sourceId,
  targetId,
  relationshipType: 'SUPPORTS',
  weight: 1,
})

describe('reconstructUpwardReachable', () => {
  it('returns only the entry node for an empty graph', () => {
    const result = reconstructUpwardReachable('a', [], 5)
    expect(result.ids).toEqual(['a'])
    expect(result.distances).toEqual({ a: 0 })
    expect(result.truncated).toBe(false)
  })

  it('traverses a linear chain upward with distances', () => {
    // a -> b -> c (a is the child of b, b the child of c)
    const result = reconstructUpwardReachable('a', [edge('a', 'b'), edge('b', 'c')], 5)
    expect(result.ids).toEqual(['a', 'b', 'c'])
    expect(result.distances).toEqual({ a: 0, b: 1, c: 2 })
    expect(result.parentIds).toEqual({ a: ['b'], b: ['c'], c: [] })
  })

  it('caps expansion at maxDepth and flags truncation', () => {
    const result = reconstructUpwardReachable('a', [edge('a', 'b'), edge('b', 'c')], 1)
    expect(result.ids).toEqual(['a', 'b'])
    expect(result.distances).toEqual({ a: 0, b: 1 })
    expect(result.truncated).toBe(true)
  })

  it('does not flag truncation when the cap level has no parents', () => {
    const result = reconstructUpwardReachable('a', [edge('a', 'b')], 1)
    expect(result.ids).toEqual(['a', 'b'])
    expect(result.truncated).toBe(false)
  })

  it('handles multiple parents and shared ancestors exactly once', () => {
    //        a
    //       / \
    //      p1  p2
    //       \ /
    //        g
    const edges = [edge('a', 'p1'), edge('a', 'p2'), edge('p1', 'g'), edge('p2', 'g')]
    const result = reconstructUpwardReachable('a', edges, 5)
    expect(result.ids).toEqual(['a', 'p1', 'p2', 'g'])
    expect(result.distances).toEqual({ a: 0, p1: 1, p2: 1, g: 2 })
    expect(result.parentIds['g']).toEqual([])
  })

  it('is deterministic regardless of edge input order', () => {
    const forward = [edge('a', 'p2'), edge('a', 'p1'), edge('p2', 'g2'), edge('p1', 'g1')]
    const reversed = [edge('p1', 'g1'), edge('p2', 'g2'), edge('a', 'p1'), edge('a', 'p2')]
    expect(reconstructUpwardReachable('a', forward, 5)).toEqual(
      reconstructUpwardReachable('a', reversed, 5),
    )
  })

  it('never loops forever on a cyclic graph', () => {
    // a -> b -> a
    const result = reconstructUpwardReachable('a', [edge('a', 'b'), edge('b', 'a')], 5)
    expect(result.ids).toEqual(['a', 'b'])
  })

  it('leaves disconnected nodes unreachable', () => {
    const result = reconstructUpwardReachable('a', [edge('x', 'y')], 5)
    expect(result.ids).toEqual(['a'])
  })

  it('keeps parent lists within the reachable set only', () => {
    // a -> b, but c only reachable through an edge outside the walk's depth
    const result = reconstructUpwardReachable('a', [edge('a', 'b'), edge('b', 'c')], 1)
    expect(result.parentIds['b']).toEqual([])
  })
})
