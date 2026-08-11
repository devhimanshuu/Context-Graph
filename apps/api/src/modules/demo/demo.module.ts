import { Module } from '@nestjs/common'
import { DemoService } from './demo.service'
import { DemoController } from './demo.controller'

/* Demo module — seeded tenant discovery for the web UI (dev/demo surface). */
@Module({
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
