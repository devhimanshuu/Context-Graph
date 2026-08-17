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
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role, type AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { PaginationPipe } from '../../common/pipes/pagination.pipe'
import { IUsersService } from './user.service'
import { UserResponseDto } from './user.dto'
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from './user.validation'

@ApiBearerAuth()
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(@Inject(IUsersService) private readonly usersService: IUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users in the caller organization (paginated)' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new PaginationPipe()) pagination: { page: number; limit: number },
  ) {
    return this.usersService.list(user.organizationId, pagination)
  }

  /** Declared before `:id` so the literal segment wins over the param route. */
  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated user (trusted, from the JWT)' })
  @ApiOkResponse({ type: UserResponseDto })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.organizationId, user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id (org-scoped)' })
  @ApiOkResponse({ type: UserResponseDto })
  findById(@CurrentUser() user: AuthenticatedUser, @Param('id', new UuidParamPipe()) id: string) {
    return this.usersService.findById(user.organizationId, id)
  }

  @Post()
  @Roles(Role.ADMIN, Role.HOD)
  @ApiOperation({ summary: 'Create a user (ADMIN/HOD only)' })
  @ApiOkResponse({ type: UserResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput,
  ) {
    return this.usersService.create(user.organizationId, body)
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HOD)
  @ApiOperation({ summary: 'Update a user (ADMIN/HOD only)' })
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new UuidParamPipe()) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
  ) {
    return this.usersService.update(user.organizationId, id, body)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user (ADMIN only)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', new UuidParamPipe()) id: string) {
    return this.usersService.remove(user.organizationId, id)
  }
}
