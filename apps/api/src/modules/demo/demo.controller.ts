import { Controller, Get, Inject } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { DemoBootstrapDto } from './demo.dto'
import { DemoService } from './demo.service'

/** Public demo bootstrap — seeded tenant discovery for the web UI (dev/demo surface). */
@Public()
@ApiTags('Demo')
@Controller('demo')
export class DemoController {
  constructor(@Inject(DemoService) private readonly service: DemoService) {}

  @Get('bootstrap')
  @ApiOperation({ summary: 'Demo tenant discovery: seeded organization, workspace and users' })
  @ApiOkResponse({ type: DemoBootstrapDto })
  bootstrap(): Promise<DemoBootstrapDto> {
    return this.service.bootstrap()
  }
}
