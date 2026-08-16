import { describe, expect, it } from 'vitest'
import { TokenContextBudget } from './context-budget'

const ENTRY = 'node-entry'

describe('TokenContextBudget', () => {
  it('always includes the entry node and reports truncation', async () => {
    const budget = new TokenContextBudget()
    const result = await budget.apply(
      [
        { id: ENTRY, importance: 50, distance: 0, tokens: 30 },
        { id: 'a', importance: 90, distance: 1, tokens: 30 },
        { id: 'b', importance: 20, distance: 1, tokens: 30 },
      ],
      50, // entry (30) + one 30-token node exceeds; only entry fits comfortably
      ENTRY,
    )
    expect(result.includedIds).toContain(ENTRY)
    expect(result.excludedIds.length).toBeGreaterThan(0)
    expect(result.truncated).toBe(true)
    expect(result.tokensUsed).toBeGreaterThan(0)
  })

  it('orders deterministically: entry first, then importance desc', async () => {
    const budget = new TokenContextBudget()
    const result = await budget.apply(
      [
        { id: 'low', importance: 10, distance: 1, tokens: 10 },
        { id: 'high', importance: 90, distance: 1, tokens: 10 },
        { id: ENTRY, importance: 50, distance: 0, tokens: 10 },
      ],
      1000,
      ENTRY,
    )
    expect(result.includedIds).toEqual([ENTRY, 'high', 'low'])
    expect(result.truncated).toBe(false)
  })

  it('keeps every candidate when the budget is large enough', async () => {
    const budget = new TokenContextBudget()
    const result = await budget.apply(
      [
        { id: ENTRY, importance: 50, distance: 0, tokens: 10 },
        { id: 'a', importance: 80, distance: 1, tokens: 10 },
      ],
      100,
      ENTRY,
    )
    expect(result.includedIds).toEqual([ENTRY, 'a'])
    expect(result.excludedIds).toEqual([])
    expect(result.truncated).toBe(false)
  })
})
