import { describe, expect, it } from 'vitest'
import { MinPriorityQueue } from './priority-queue'

const byNumber = (a: number, b: number): number => a - b

describe('MinPriorityQueue', () => {
  it('pops items in ascending order', () => {
    const queue = new MinPriorityQueue<number>(byNumber)
    for (const value of [5, 1, 4, 2, 3]) queue.push(value)
    expect([queue.pop(), queue.pop(), queue.pop(), queue.pop(), queue.pop()]).toEqual([
      1, 2, 3, 4, 5,
    ])
  })

  it('returns undefined when empty', () => {
    const queue = new MinPriorityQueue<number>(byNumber)
    expect(queue.pop()).toBeUndefined()
    expect(queue.size).toBe(0)
  })

  it('honors the comparator for tie-breaking', () => {
    const byCostThenId = (a: { cost: number; id: string }, b: { cost: number; id: string }) =>
      a.cost !== b.cost ? a.cost - b.cost : a.id.localeCompare(b.id)
    const queue = new MinPriorityQueue(byCostThenId)
    queue.push({ cost: 1, id: 'b' })
    queue.push({ cost: 1, id: 'a' })
    queue.push({ cost: 0, id: 'c' })
    expect(queue.pop()).toEqual({ cost: 0, id: 'c' })
    expect(queue.pop()).toEqual({ cost: 1, id: 'a' })
    expect(queue.pop()).toEqual({ cost: 1, id: 'b' })
  })

  it('interleaves pushes and pops correctly', () => {
    const queue = new MinPriorityQueue<number>(byNumber)
    queue.push(4)
    queue.push(1)
    expect(queue.pop()).toBe(1)
    queue.push(2)
    queue.push(0)
    expect(queue.pop()).toBe(0)
    expect(queue.pop()).toBe(2)
    expect(queue.pop()).toBe(4)
  })
})
