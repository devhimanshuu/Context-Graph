import { NodeStatus, NodeType, RelationshipType } from '@contextgraph/types'
import { Graph } from '../domain/graph'
import type { GraphEdge } from '../domain/graph-edge'
import type { GraphNode, GraphNodeId } from '../domain/graph-node'
import { GraphEdgeEntity } from '../graph-edge.entity'
import type { NodeProjection } from '../graph.repository'

export const ORG_ID = 'org-1'
export const WORKSPACE_ID = 'ws-1'

/** Nodes are `source -> target` = child -> parent (upward traversal). */
export interface GraphFixture {
  readonly nodes: NodeProjection[]
  readonly edges: GraphEdgeEntity[]
}

export function makeNodeProjection(id: string, title = `Node ${id}`): NodeProjection {
  return { id, title, type: NodeType.FACT, status: NodeStatus.ACTIVE }
}

export function makeEdgeEntity(
  id: string,
  sourceId: GraphNodeId,
  targetId: GraphNodeId,
  relationshipType: RelationshipType = RelationshipType.SUPPORTS,
  weight = 1,
): GraphEdgeEntity {
  return new GraphEdgeEntity(
    id,
    ORG_ID,
    WORKSPACE_ID,
    sourceId,
    targetId,
    relationshipType,
    weight,
    null,
    null,
    {},
    null,
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z',
    null,
  )
}

/** Builds a domain Graph from a fixture (no validation). */
export function fixtureToGraph(fixture: GraphFixture): Graph {
  const nodes: GraphNode[] = fixture.nodes.map((node) => ({
    id: node.id,
    title: node.title,
    type: node.type,
    status: node.status,
  }))
  const edges: GraphEdge[] = fixture.edges.map((edge) => ({
    id: edge.id,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relationshipType: edge.relationshipType,
    weight: edge.weight,
  }))
  return new Graph(nodes, edges)
}

/** A single node with no edges. */
export function singleNodeGraph(nodeId = 'n0'): GraphFixture {
  return { nodes: [makeNodeProjection(nodeId)], edges: [] }
}

/** n0 -> n1 -> … -> n(size-1): a linear ancestor chain of `size` nodes. */
export function linearChain(size: number, prefix = 'n'): GraphFixture {
  const nodes = Array.from({ length: size }, (_, index) => makeNodeProjection(`${prefix}${index}`))
  const edges = Array.from({ length: Math.max(0, size - 1) }, (_, index) =>
    makeEdgeEntity(`e${index}`, `${prefix}${index}`, `${prefix}${index + 1}`),
  )
  return { nodes, edges }
}

/**
 * A tree: every node at level d has `branching` children pointing up at the
 * parent on level d-1. Entry nodes live at the deepest level.
 */
export function treeGraph(depth: number, branching: number, rootId = 'root'): GraphFixture {
  const nodes: NodeProjection[] = [makeNodeProjection(rootId)]
  const edges: GraphEdgeEntity[] = []
  let nextId = 0
  const idsByLevel: string[][] = [[rootId]]

  for (let level = 1; level <= depth; level += 1) {
    const parents = idsByLevel[level - 1]
    if (parents === undefined) break
    const childrenAtLevel: string[] = []
    for (let index = 0; index < parents.length * branching; index += 1) {
      const childId = `${rootId}-c${nextId}`
      nextId += 1
      nodes.push(makeNodeProjection(childId))
      childrenAtLevel.push(childId)
      // Child points up at its parent on the level above.
      const parent = parents[Math.floor(index / branching)]
      if (parent !== undefined) {
        edges.push(makeEdgeEntity(`e-${level}-${index}`, childId, parent))
      }
    }
    idsByLevel.push(childrenAtLevel)
  }
  return { nodes, edges }
}

/**
 * Diamond with a shared ancestor:
 *
 *   n0 (entry) -> n1, n2 -> n3 (shared grandparent)
 */
export function sharedAncestorGraph(): GraphFixture {
  const nodes = ['n0', 'n1', 'n2', 'n3'].map((id) => makeNodeProjection(id))
  const edges = [
    makeEdgeEntity('e1', 'n0', 'n1'),
    makeEdgeEntity('e2', 'n0', 'n2'),
    makeEdgeEntity('e3', 'n1', 'n3'),
    makeEdgeEntity('e4', 'n2', 'n3'),
  ]
  return { nodes, edges }
}

/** A node with multiple direct parents (multi-parent DAG). */
export function multiParentGraph(): GraphFixture {
  const nodes = ['entry', 'p1', 'p2', 'p3', 'gp'].map((id) => makeNodeProjection(id))
  const edges = [
    makeEdgeEntity('e1', 'entry', 'p1'),
    makeEdgeEntity('e2', 'entry', 'p2'),
    makeEdgeEntity('e3', 'p1', 'gp'),
    makeEdgeEntity('e4', 'p2', 'gp'),
    makeEdgeEntity('e5', 'p3', 'gp'),
  ]
  return { nodes, edges }
}

/** Two disconnected components. */
export function disconnectedGraph(): GraphFixture {
  const nodes = ['a0', 'a1', 'b0', 'b1'].map((id) => makeNodeProjection(id))
  const edges = [makeEdgeEntity('ea1', 'a0', 'a1'), makeEdgeEntity('eb1', 'b0', 'b1')]
  return { nodes, edges }
}

/** A node that points at itself. */
export function selfReferenceGraph(): GraphFixture {
  return {
    nodes: [makeNodeProjection('n0'), makeNodeProjection('n1')],
    edges: [makeEdgeEntity('e0', 'n0', 'n0'), makeEdgeEntity('e1', 'n0', 'n1')],
  }
}

/** A → B → C → A. */
export function cycleGraph(): GraphFixture {
  const nodes = ['a', 'b', 'c'].map((id) => makeNodeProjection(id))
  const edges = [
    makeEdgeEntity('e1', 'a', 'b'),
    makeEdgeEntity('e2', 'b', 'c'),
    makeEdgeEntity('e3', 'c', 'a'),
  ]
  return { nodes, edges }
}

/** Two identical edges between the same pair. */
export function duplicateEdgeGraph(): GraphFixture {
  const nodes = ['n0', 'n1'].map((id) => makeNodeProjection(id))
  const edges = [makeEdgeEntity('e1', 'n0', 'n1'), makeEdgeEntity('e2', 'n0', 'n1')]
  return { nodes, edges }
}

/** A cycle with an acyclic tail hanging off it (validates extraction). */
export function cycleWithTailGraph(): GraphFixture {
  const nodes = ['a', 'b', 'c', 'tail'].map((id) => makeNodeProjection(id))
  const edges = [
    makeEdgeEntity('e1', 'a', 'b'),
    makeEdgeEntity('e2', 'b', 'c'),
    makeEdgeEntity('e3', 'c', 'a'),
    makeEdgeEntity('e4', 'a', 'tail'),
  ]
  return { nodes, edges }
}

/** An edge referencing a node that does not exist in the node list. */
export function brokenEdgeGraph(): GraphFixture {
  return {
    nodes: [makeNodeProjection('n0')],
    edges: [makeEdgeEntity('e1', 'n0', 'ghost')],
  }
}

/**
 * A wide DAG of `nodeCount` nodes: node i points up at nodes i+1 … i+branch
 * (clamped to the node range), giving dense shared ancestry and multi-parent
 * coverage. Edge ids are deterministic.
 */
export function largeGraph(nodeCount: number, branch = 3): GraphFixture {
  const nodes = Array.from({ length: nodeCount }, (_, index) => makeNodeProjection(`n${index}`))
  const edges: GraphEdgeEntity[] = []
  let edgeId = 0
  for (let source = 0; source < nodeCount; source += 1) {
    for (let offset = 1; offset <= branch; offset += 1) {
      const target = source + offset
      if (target >= nodeCount) break
      edges.push(makeEdgeEntity(`e${edgeId}`, `n${source}`, `n${target}`))
      edgeId += 1
    }
  }
  return { nodes, edges }
}
