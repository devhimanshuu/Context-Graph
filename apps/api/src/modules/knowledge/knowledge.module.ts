import { Module } from '@nestjs/common'
import { IKnowledgeRepository, KnowledgePrismaRepository } from './knowledge.repository'
import { IKnowledgeService, KnowledgeService } from './knowledge.service'
import { KnowledgeController } from './knowledge.controller'

/* Knowledge module — the knowledge graph's node storage (facts, constraints, */
@Module({
  controllers: [KnowledgeController],
  providers: [
    { provide: IKnowledgeRepository, useClass: KnowledgePrismaRepository },
    { provide: IKnowledgeService, useClass: KnowledgeService },
  ],
  exports: [IKnowledgeRepository, IKnowledgeService],
})
export class KnowledgeModule {}
