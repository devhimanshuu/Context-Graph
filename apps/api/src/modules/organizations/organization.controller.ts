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
import { Role } from '@contextgraph/types'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { IOrganizationsService } from './organization.service'
import { OrganizationResponseDto } from './organization.dto'
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from './organization.validation'

@ApiBearerAuth()
@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(@Inject(IOrganizationsService) private readonly service: IOrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List organizations' })
  @ApiOkResponse({ type: OrganizationResponseDto, isArray: true })
  list() {
    return this.service.list()
  }

  /** Slug lookup stays public so tenant selection works pre-auth. */
  @Public()
  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Find an organization by slug (public)' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an organization by id' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  findById(@Param('id', new UuidParamPipe()) id: string) {
    return this.service.findById(id)
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create an organization (ADMIN only)' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  create(@Body(new ZodValidationPipe(createOrganizationSchema)) body: CreateOrganizationInput) {
    return this.service.create(body)
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update an organization (ADMIN only)' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  update(
    @Param('id', new UuidParamPipe()) id: string,
    @Body(new ZodValidationPipe(updateOrganizationSchema)) body: UpdateOrganizationInput,
  ) {
    return this.service.update(id, body)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an organization (ADMIN only)' })
  remove(@Param('id', new UuidParamPipe()) id: string) {
    return this.service.remove(id)
  }
}
