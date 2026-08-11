import { describe, expect, it } from 'vitest'
import { estimateTokens, fitToBudget, type BudgetCandidate } from './context-token-budget'

const candidate = (overrides: Partial<BudgetCandidate> & { id: string }): BudgetCandidate => ({
  importance: 50,
  distance: 0,
  tokens: 100,
  ...overrides,
})

describe('estimateTokens', () => {
  it('estimates ~4 chars per token', () => {
    expect(estimateTokens('')).toBe(1)
    expect(estimateTokens('a'.repeat(40))).toBe(10)
    expect(estimateTokens('a'.repeat(41))).toBe(11)
  })
})

describe('fitToBudget', () => {
  it('always includes the entry node first', () => {
    const result = fitToBudget(
      [
        candidate({ id: 'high', importance: 90, tokens: 40 }),
        candidate({ id: 'entry', importance: 10 }),
      ],
      150,
      'entry',
    )
    expect(result.includedIds).toEqual(['entry', 'high'])
  })

  it('orders by importance desc, then distance asc, then id', () => {
    const result = fitToBudget(
      [
        candidate({ id: 'c', importance: 50, distance: 1 }),
        candidate({ id: 'entry', importance: 20, distance: 0 }),
        candidate({ id: 'a', importance: 80, distance: 2 }),
        candidate({ id: 'b', importance: 80, distance: 1 }),
      ],
      100_000,
      'entry',
    )
    // Equal importance (a, b) breaks ties by distance asc — b (d1) before a (d2).
    expect(result.includedIds).toEqual(['entry', 'b', 'a', 'c'])
  })

  it('truncates when the budget is exhausted and reports tokens used', () => {
    const result = fitToBudget(
      [
        candidate({ id: 'entry', importance: 10, tokens: 60 }),
        candidate({ id: 'keep', importance: 80, tokens: 40 }),
        candidate({ id: 'cut', importance: 70, tokens: 40 }),
      ],
      100,
      'entry',
    )
    expect(result.includedIds).toEqual(['entry', 'keep'])
    expect(result.excludedIds).toEqual(['cut'])
    expect(result.tokensUsed).toBe(100)
    expect(result.truncated).toBe(true)
  })

  it('keeps the entry node even when it alone exceeds the budget', () => {
    const result = fitToBudget(
      [candidate({ id: 'entry', importance: 10, tokens: 500 })],
      100,
      'entry',
    )
    expect(result.includedIds).toEqual(['entry'])
    expect(result.tokensUsed).toBe(500)
    expect(result.truncated).toBe(false)
  })

  it('is deterministic regardless of input order', () => {
    const forward = [
      candidate({ id: 'entry', importance: 10 }),
      candidate({ id: 'b', importance: 90, distance: 2 }),
      candidate({ id: 'a', importance: 90, distance: 1 }),
    ]
    const reversed = [...forward].reverse()
    expect(fitToBudget(forward, 10_000, 'entry')).toEqual(fitToBudget(reversed, 10_000, 'entry'))
  })
})
