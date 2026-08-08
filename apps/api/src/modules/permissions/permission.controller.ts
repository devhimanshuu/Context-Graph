import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role, type AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { IPermissionService } from './permission.service'
import { CompiledPermissionsDto, PermissionProfileResponseDto } from './permission.dto'
import {
  assignProfileSchema,
  createProfileSchema,
  type CreateProfileInput,
} from './permission.validation'

@ApiBearerAuth()
@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(@Inject(IPermissionService) private readonly service: IPermissionService) {}

  @Get('profiles')
  @ApiOperation({ summary: 'List permission profiles in the caller organization' })
  @ApiOkResponse({ type: PermissionProfileResponseDto, isArray: true })
  listProfiles(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listProfiles(user.organizationId)
  }

  @Get('profiles/:id')
  @ApiOperation({ summary: 'Get a permission profile' })
  @ApiOkResponse({ type: PermissionProfileResponseDto })
  getProfile(@Param('id', new UuidParamPipe()) id: string) {
    return this.service.getProfile(id)
  }

  @Post('profiles')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a permission profile (ADMIN only)' })
  @ApiOkResponse({ type: PermissionProfileResponseDto })
  createProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createProfileSchema)) body: CreateProfileInput,
  ) {
    return this.service.createProfile(user.organizationId, body)
  }

  @Post('assign')
  @Roles(Role.ADMIN, Role.HOD)
  @ApiOperation({ summary: 'Assign a profile to a user (ADMIN/HOD only)' })
  async assign(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(assignProfileSchema)) body: { userId: string; profileId: string },
  ) {
    await this.service.assignProfile(body.profileId, body.userId, user.id)
    return { assigned: true }
  }

  @Get('me')
  @ApiOperation({ summary: 'Compile the caller permissions (scaffold)' })
  @ApiOkResponse({ type: CompiledPermissionsDto })
  myPermissions(@CurrentUser() user: AuthenticatedUser) {
    return this.service.compileUserPermissions(user)
  }
}
