/**
 * Array-based binary min-heap. Used by the weighted traversal engine to pop
 * nodes in cost order. The caller supplies a comparator so tie-breaking is
 * explicit (e.g. by node id) — the heap never relies on insertion order for
 * semantic ordering.
 */
export class MinPriorityQueue<T> {
  private readonly items: T[] = []

  constructor(private readonly compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.items.length
  }

  push(item: T): void {
    this.items.push(item)
    this.siftUp(this.items.length - 1)
  }

  /** Removes and returns the minimum item, or undefined when empty. */
  pop(): T | undefined {
    if (this.items.length === 0) return undefined
    const top = this.items[0]
    const last = this.items.pop()
    if (last !== undefined && this.items.length > 0) {
      this.items[0] = last
      this.siftDown(0)
    }
    return top
  }

  private siftUp(index: number): void {
    let current = index
    while (current > 0) {
      const parent = (current - 1) >> 1
      const item = this.items[current]
      const parentItem = this.items[parent]
      if (item === undefined || parentItem === undefined) break
      if (this.compare(item, parentItem) >= 0) break
      this.items[current] = parentItem
      this.items[parent] = item
      current = parent
    }
  }

  private siftDown(index: number): void {
    let current = index
    for (;;) {
      const left = current * 2 + 1
      const right = left + 1
      let smallest = current

      const leftItem = this.items[left]
      const rightItem = this.items[right]
      const currentItem = this.items[smallest]
      if (
        leftItem !== undefined &&
        currentItem !== undefined &&
        this.compare(leftItem, currentItem) < 0
      ) {
        smallest = left
      }
      const smallestItem = this.items[smallest]
      if (
        rightItem !== undefined &&
        smallestItem !== undefined &&
        this.compare(rightItem, smallestItem) < 0
      ) {
        smallest = right
      }
      if (smallest === current) return

      const currentValue = this.items[current]
      const smallestValue = this.items[smallest]
      if (currentValue === undefined || smallestValue === undefined) return
      this.items[current] = smallestValue
      this.items[smallest] = currentValue
      current = smallest
    }
  }
}
