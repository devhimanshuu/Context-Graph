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
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { IDepartmentsService } from './department.service'
import { DepartmentResponseDto } from './department.dto'
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
} from './department.validation'

@ApiBearerAuth()
@ApiTags('Departments')
@Controller()
export class DepartmentsController {
  constructor(@Inject(IDepartmentsService) private readonly service: IDepartmentsService) {}

  /* The `:organizationId` param is compared against the JWT org claim by the */
  @Get('organizations/:organizationId/departments')
  @ApiOperation({ summary: 'List departments in an organization' })
  @ApiOkResponse({ type: DepartmentResponseDto, isArray: true })
  list(@Param('organizationId', new UuidParamPipe()) organizationId: string) {
    return this.service.findByOrganization(organizationId)
  }

  @Post('organizations/:organizationId/departments')
  @Roles(Role.ADMIN, Role.HOD)
  @ApiOperation({ summary: 'Create a department (ADMIN/HOD only)' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  create(
    @Param('organizationId', new UuidParamPipe()) organizationId: string,
    @Body(new ZodValidationPipe(createDepartmentSchema)) body: CreateDepartmentInput,
  ) {
    return this.service.create(organizationId, body)
  }

  @Get('departments/:id')
  @ApiOperation({ summary: 'Get a department by id' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  findById(@Param('id', new UuidParamPipe()) id: string) {
    return this.service.findById(id)
  }

  @Patch('departments/:id')
  @Roles(Role.ADMIN, Role.HOD)
  @ApiOperation({ summary: 'Update a department (ADMIN/HOD only)' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  update(
    @Param('id', new UuidParamPipe()) id: string,
    @Body(new ZodValidationPipe(updateDepartmentSchema)) body: UpdateDepartmentInput,
  ) {
    return this.service.update(id, body)
  }

  @Delete('departments/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a department (ADMIN only)' })
  remove(@Param('id', new UuidParamPipe()) id: string) {
    return this.service.remove(id)
  }
}
