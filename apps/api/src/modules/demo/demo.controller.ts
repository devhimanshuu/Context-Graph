import { Body, Controller, Get, Inject, Post } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { DemoBootstrapDto } from './demo.dto'
import { DemoService } from './demo.service'
import type { AuthenticatedUser } from '@contextgraph/types'

/** Demo bootstrap is public; data-loading endpoints require a session. */
@ApiTags('Demo')
@Controller('demo')
export class DemoController {
  constructor(@Inject(DemoService) private readonly service: DemoService) {}

  @Public()
  @Get('bootstrap')
  @ApiOperation({ summary: 'Demo tenant discovery: seeded organization, workspace and users' })
  @ApiOkResponse({ type: DemoBootstrapDto })
  bootstrap(): Promise<DemoBootstrapDto> {
    return this.service.bootstrap()
  }

  @Post('starter-knowledge')
  @ApiOperation({
    summary: 'Load a starter knowledge set into a workspace (idempotent)',
  })
  async loadStarterKnowledge(
    @CurrentUser() _user: AuthenticatedUser,
    @Body() body: { workspaceId: string },
  ): Promise<{ success: boolean; data: { created: number } }> {
    const created = await this.service.loadStarterKnowledge(body.workspaceId)
    return { success: true, data: created }
  }
}
