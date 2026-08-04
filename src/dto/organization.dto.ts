import type { Organization } from '@/domain/models'
import type { CreateOrganizationSchema, UpdateOrganizationSchema } from '@/validations/organization'
import type { PublicEntity } from './common'

/** Body contract for POST /organizations. */
export type CreateOrganizationRequestDto = CreateOrganizationSchema

/** Body contract for PATCH /organizations/:id. */
export type UpdateOrganizationRequestDto = UpdateOrganizationSchema

/** Wire contract for GET /organizations/:id. */
export type OrganizationResponseDto = PublicEntity<Organization>
