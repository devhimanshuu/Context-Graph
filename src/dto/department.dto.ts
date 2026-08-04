import type { Department } from '@/domain/models'
import type { CreateDepartmentSchema, UpdateDepartmentSchema } from '@/validations/department'
import type { PublicEntity } from './common'

export type CreateDepartmentRequestDto = CreateDepartmentSchema

export type UpdateDepartmentRequestDto = UpdateDepartmentSchema

export type DepartmentResponseDto = PublicEntity<Department>
