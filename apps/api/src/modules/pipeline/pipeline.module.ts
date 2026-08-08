import { Module } from '@nestjs/common'
import { IPipelineService, PipelineService } from './pipeline.service'
import { PipelineController } from './pipeline.controller'

/* Pipeline module — the context-assembly pipeline orchestrator. */
@Module({
  controllers: [PipelineController],
  providers: [{ provide: IPipelineService, useClass: PipelineService }],
  exports: [IPipelineService],
})
export class PipelineModule {}
