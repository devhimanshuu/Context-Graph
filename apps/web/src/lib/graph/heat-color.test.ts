import { describe, expect, it } from 'vitest'
import { heatColor } from './heat-color'

describe('heatColor', () => {
  it('falls back to muted when the scale is empty', () => {
    expect(heatColor(5, 0)).toBe('bg-muted')
  })

  it('maps the fastest cells to the coolest tone', () => {
    expect(heatColor(1, 100)).toBe('bg-emerald-500/10 text-emerald-600 dark:text-emerald-400')
  })

  it('escalates tone by ratio band', () => {
    expect(heatColor(25, 100)).toBe('bg-emerald-500/25 text-emerald-700 dark:text-emerald-300')
    expect(heatColor(50, 100)).toBe('bg-amber-500/25 text-amber-700 dark:text-amber-300')
    expect(heatColor(70, 100)).toBe('bg-orange-500/30 text-orange-700 dark:text-orange-300')
    expect(heatColor(100, 100)).toBe('bg-rose-500/40 text-rose-700 dark:text-rose-300')
  })

  it('treats the max cell itself as the hottest tone', () => {
    expect(heatColor(42, 42)).toBe('bg-rose-500/40 text-rose-700 dark:text-rose-300')
  })

  it('handles zero-duration cells', () => {
    expect(heatColor(0, 10)).toBe('bg-emerald-500/10 text-emerald-600 dark:text-emerald-400')
  })
})
