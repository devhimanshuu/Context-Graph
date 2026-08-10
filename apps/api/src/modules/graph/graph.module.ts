import { Module } from '@nestjs/common'
import { AuthorizationModule } from '../authorization/authorization.module'
import { IGraphRepository, GraphPrismaRepository } from './graph.repository'
import { IGraphService, GraphService } from './graph.service'
import { GraphController } from './graph.controller'
import { GraphDebugController } from './graph.debug.controller'
import { GraphBuilder } from './engine/graph-builder'
import { GraphValidator } from './engine/graph-validator'
import { CycleDetector } from './engine/cycle-detector'
import { BfsTraversalEngine } from './engine/bfs-traversal.engine'
import { WeightedTraversalEngine } from './engine/weighted-traversal.engine'
import { IGraphTraversalEngine } from './engine/traversal-engine.interface'
import { IGraphCache, InMemoryGraphCache } from './cache'
import { IEntryNodeResolver, DefaultEntryNodeResolver } from './services/entry-node-resolver'
import { GraphMetricsCollector } from './services/graph-metrics-collector'
import { ReachabilityService } from './services/reachability.service'

/**
 * Graph module — the reusable Graph Engine.
 *
 * Dependency inversion: the module binds interface tokens (IGraphRepository,
 * IGraphCache, IEntryNodeResolver) to concrete implementations, so the engine
 * and services depend on contracts, not on Prisma or a specific cache.
 * Swapping BFS for another strategy only replaces the engine provider.
 */
@Module({
  imports: [AuthorizationModule],
  controllers: [GraphController, GraphDebugController],
  providers: [
    // Persistence + cache + entry resolution: swappable implementations.
    { provide: IGraphRepository, useClass: GraphPrismaRepository },
    { provide: IGraphCache, useClass: InMemoryGraphCache },
    { provide: IEntryNodeResolver, useClass: DefaultEntryNodeResolver },
    // Engine stack (pure, framework-agnostic). BFS is the default binding
    // for the traversal contract; the weighted strategy is selectable per
    // query and swappable as the default with a one-line change.
    CycleDetector,
    GraphValidator,
    GraphBuilder,
    BfsTraversalEngine,
    { provide: IGraphTraversalEngine, useClass: BfsTraversalEngine },
    { provide: WeightedTraversalEngine, useFactory: () => new WeightedTraversalEngine() },
    // Application services.
    GraphMetricsCollector,
    ReachabilityService,
    { provide: IGraphService, useClass: GraphService },
  ],
  exports: [
    IGraphRepository,
    IGraphService,
    IGraphTraversalEngine,
    WeightedTraversalEngine,
    GraphBuilder,
  ],
})
export class GraphModule {}
