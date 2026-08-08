import { Module } from '@nestjs/common'
import { IGraphRepository, GraphPrismaRepository } from './graph.repository'
import { IGraphService, GraphService } from './graph.service'
import { GraphController } from './graph.controller'

/* Graph module — server-side graph surface (edges + reachability contract). */
@Module({
  controllers: [GraphController],
  providers: [
    { provide: IGraphRepository, useClass: GraphPrismaRepository },
    { provide: IGraphService, useClass: GraphService },
  ],
  exports: [IGraphRepository, IGraphService],
})
export class GraphModule {}
