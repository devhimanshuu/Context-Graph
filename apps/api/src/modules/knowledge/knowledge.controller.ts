import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PermissionAction, Role, type AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { IKnowledgeService } from './knowledge.service'
import { KnowledgeNodeResponseDto } from './knowledge.dto'
import {
  createKnowledgeNodeSchema,
  updateKnowledgeNodeSchema,
  type CreateKnowledgeNodeInput,
  type UpdateKnowledgeNodeInput,
} from './knowledge.validation'

@ApiBearerAuth()
@ApiTags('Knowledge')
@Controller()
export class KnowledgeController {
  constructor(@Inject(IKnowledgeService) private readonly service: IKnowledgeService) {}

  @Get('workspaces/:workspaceId/nodes')
  @ApiOperation({ summary: 'List knowledge nodes in a workspace (org-scoped)' })
  @ApiOkResponse({ type: KnowledgeNodeResponseDto, isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new UuidParamPipe()) workspaceId: string,
  ) {
    return this.service.findByWorkspace(user.organizationId, workspaceId)
  }

  @Post('workspaces/:workspaceId/nodes')
  @RequirePermissions({ resource: 'knowledge-node', action: PermissionAction.WRITE })
  @ApiOperation({ summary: 'Create a knowledge node' })
  @ApiOkResponse({ type: KnowledgeNodeResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new UuidParamPipe()) workspaceId: string,
    @Body(new ZodValidationPipe(createKnowledgeNodeSchema)) body: CreateKnowledgeNodeInput,
  ) {
    return this.service.create(user, workspaceId, body)
  }

  @Get('nodes/:id')
  @ApiOperation({ summary: 'Get a knowledge node by id (org-scoped)' })
  @ApiOkResponse({ type: KnowledgeNodeResponseDto })
  findById(@CurrentUser() user: AuthenticatedUser, @Param('id', new UuidParamPipe()) id: string) {
    return this.service.findById(user.organizationId, id)
  }

  @Patch('nodes/:id')
  @RequirePermissions({ resource: 'knowledge-node', action: PermissionAction.WRITE })
  @ApiOperation({ summary: 'Update a knowledge node (org-scoped)' })
  @ApiOkResponse({ type: KnowledgeNodeResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new UuidParamPipe()) id: string,
    @Body(new ZodValidationPipe(updateKnowledgeNodeSchema)) body: UpdateKnowledgeNodeInput,
  ) {
    return this.service.update(user.organizationId, id, body)
  }

  @Delete('nodes/:id')
  @Roles(Role.ADMIN, Role.QUALITY)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a knowledge node (ADMIN/QUALITY only)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', new UuidParamPipe()) id: string) {
    return this.service.remove(user.organizationId, id)
  }
}
