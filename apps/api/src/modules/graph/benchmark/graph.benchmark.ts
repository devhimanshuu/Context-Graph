import { BfsTraversalEngine } from '../engine/bfs-traversal.engine'
import { WeightedTraversalEngine } from '../engine/weighted-traversal.engine'
import { GraphBuilder } from '../engine/graph-builder'
import { GraphValidator } from '../engine/graph-validator'
import { CycleDetector } from '../engine/cycle-detector'
import { largeGraph } from '../testing/graph-fixtures'

/**
 * Lightweight traversal benchmark: run `npm run bench:graph` from apps/api.
 *
 * Generates dense DAGs of 100 → 100k nodes and reports node/edge counts and
 * traversal duration per size for both the BFS and weighted (A-star/Dijkstra)
 * strategies. Results are informational only — no CI gate.
 */

const SIZES = [100, 1_000, 10_000, 100_000] as const

const bfs = new BfsTraversalEngine()
const weighted = new WeightedTraversalEngine()
const builder = new GraphBuilder(new GraphValidator(new CycleDetector()))

function formatMs(ms: number): string {
  return `${ms.toFixed(2)} ms`
}

async function run(): Promise<void> {
  const out = (line: string): void => {
    process.stdout.write(`${line}\n`)
  }

  out('=== ContextGraph Graph Traversal Benchmark ===')
  out('')
  out('nodes\t\tedges\t\tBFS\t\tweighted\tvisited\tdepth')
  out('-'.repeat(84))

  for (const size of SIZES) {
    const fixture = largeGraph(size, 3)
    const graph = builder.build(fixture.nodes, fixture.edges, { validate: false })

    const bfsStart = performance.now()
    const bfsResult = bfs.traverse(graph, { entryNodeId: 'n0', maxDepth: size })
    const bfsDuration = performance.now() - bfsStart

    const weightedStart = performance.now()
    const weightedResult = weighted.traverse(graph, { entryNodeId: 'n0', maxDepth: size })
    const weightedDuration = performance.now() - weightedStart

    out(
      `${size}\t\t${fixture.edges.length}\t\t${formatMs(bfsDuration)}\t\t` +
        `${formatMs(weightedDuration)}\t${bfsResult.metadata.visitedNodeCount}\t` +
        `${weightedResult.metadata.traversalDepth}`,
    )
  }

  out('')
  out('Done. See docs/graph-engine.md for complexity analysis.')
}

void run()
