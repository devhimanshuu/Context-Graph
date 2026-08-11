import type { GraphEdge } from '@/lib/api/types'

/**
 * Result of reconstructing the pre-permission reachable set.
 *
 * Mirrors the shape of the API's traversal output so the graph view can
 * derive which reachable nodes were withheld by authorization (`R \ nodeIds`).
 */
export interface ReachableReconstruction {
  /** Every unique reachable node id, in deterministic discovery order. */
  readonly ids: string[]
  /** Hop distance from the entry node per node id (entry = 0). */
  readonly distances: Record<string, number>
  /** Discovery order index per node id. */
  readonly order: Record<string, number>
  /** Direct parents (one hop toward the root) per node id, within the set. */
  readonly parentIds: Record<string, string[]>
  /** True when maxDepth cut the walk short (parents existed at the cap). */
  readonly truncated: boolean
}

/**
 * Reconstructs the upward reachable set from the workspace edge list.
 *
 * This is a VISUALIZATION-ONLY mirror of the API's BFS engine (UP direction,
 * source -> target = child -> parent). The API's `/edges` endpoint exposes
 * the full workspace graph, so the pre-permission reachable set can be
 * derived here without any backend change — the engine keeps its
 * no-structure-leak contract, and the UI can still render withheld nodes
 * dimmed (without their titles) to explain why the count is smaller.
 *
 * Semantics match the engine: iterative queue, visited set (each node
 * processed once), depth cap (nodes at maxDepth are emitted but not
 * expanded), and lexicographically sorted expansion for deterministic order.
 */
export function reconstructUpwardReachable(
  entryNodeId: string,
  edges: readonly GraphEdge[],
  maxDepth: number,
): ReachableReconstruction {
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    const parents = adjacency.get(edge.sourceId)
    if (parents === undefined) {
      adjacency.set(edge.sourceId, [edge.targetId])
    } else {
      parents.push(edge.targetId)
    }
  }
  for (const parents of adjacency.values()) parents.sort()

  const visited = new Set<string>([entryNodeId])
  const queue: string[] = [entryNodeId]
  let head = 0

  const distances: Record<string, number> = { [entryNodeId]: 0 }
  const order: Record<string, number> = { [entryNodeId]: 0 }
  const discovered: string[] = [entryNodeId]
  let truncated = false

  while (head < queue.length) {
    const current = queue[head]
    head += 1
    if (current === undefined) break
    const distance = distances[current] ?? 0
    const parents = adjacency.get(current)

    if (distance >= maxDepth) {
      if (parents !== undefined && parents.length > 0) truncated = true
      continue
    }

    for (const parent of parents ?? []) {
      if (visited.has(parent)) continue
      visited.add(parent)
      distances[parent] = distance + 1
      order[parent] = discovered.length
      discovered.push(parent)
      queue.push(parent)
    }
  }

  const parentIds: Record<string, string[]> = {}
  for (const id of discovered) {
    parentIds[id] = (adjacency.get(id) ?? []).filter((parent) => visited.has(parent))
  }

  return { ids: discovered, distances, order, parentIds, truncated }
}
