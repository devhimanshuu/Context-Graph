/* Loop detector — unit tests. */

import { describe, it, expect } from 'vitest'
import { LoopDetector } from './loop-detector'

describe('LoopDetector', () => {
  it('does not detect loop for single call', () => {
    const detector = new LoopDetector()
    detector.record('search', { query: 'test' })
    expect(detector.isLooping('search', { query: 'test' }, 3)).toBe(false)
  })

  it('detects loop when threshold reached', () => {
    const detector = new LoopDetector()
    detector.record('search', { query: 'test' })
    detector.record('search', { query: 'test' })
    detector.record('search', { query: 'test' })
    expect(detector.isLooping('search', { query: 'test' }, 3)).toBe(true)
  })

  it('does not detect loop for different inputs', () => {
    const detector = new LoopDetector()
    detector.record('search', { query: 'a' })
    detector.record('search', { query: 'a' })
    detector.record('search', { query: 'b' })
    expect(detector.isLooping('search', { query: 'a' }, 3)).toBe(false)
  })

  it('does not detect loop for different tools', () => {
    const detector = new LoopDetector()
    detector.record('search', { query: 'test' })
    detector.record('search', { query: 'test' })
    detector.record('lookup', { query: 'test' })
    expect(detector.isLooping('search', { query: 'test' }, 3)).toBe(false)
  })

  it('resets tracking', () => {
    const detector = new LoopDetector()
    detector.record('search', { query: 'test' })
    detector.record('search', { query: 'test' })
    detector.record('search', { query: 'test' })
    detector.reset('exec-1')
    expect(detector.isLooping('search', { query: 'test' }, 3)).toBe(false)
  })

  it('handles key order independence', () => {
    const detector = new LoopDetector()
    detector.record('search', { b: 2, a: 1 })
    detector.record('search', { a: 1, b: 2 })
    detector.record('search', { b: 2, a: 1 })
    expect(detector.isLooping('search', { a: 1, b: 2 }, 3)).toBe(true)
  })
})
