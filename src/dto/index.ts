/**
 * DTO barrel — import from `@/dto`.
 *
 * Request DTOs derive from Zod schemas; response DTOs derive from domain
 * models. See `./common.ts` for the separation rule.
 */
export type {
  ApiEnvelope,
  ApiEnvelopeError,
  ApiEnvelopeMeta,
  ApiErrorEnvelope,
} from './api-response.dto'
export type { HealthStatusDto } from './health.dto'
export type { PublicEntity } from './common'
export type {
  CreateOrganizationRequestDto,
  UpdateOrganizationRequestDto,
  OrganizationResponseDto,
} from './organization.dto'
export type {
  CreateWorkspaceRequestDto,
  UpdateWorkspaceRequestDto,
  WorkspaceResponseDto,
} from './workspace.dto'
export type {
  CreateDepartmentRequestDto,
  UpdateDepartmentRequestDto,
  DepartmentResponseDto,
} from './department.dto'
export type { CreateUserRequestDto, UpdateUserRequestDto, UserResponseDto } from './user.dto'
export type {
  CreateKnowledgeNodeRequestDto,
  UpdateKnowledgeNodeRequestDto,
  KnowledgeNodeResponseDto,
} from './knowledge-node.dto'
export type {
  CreateGraphEdgeRequestDto,
  UpdateGraphEdgeRequestDto,
  GraphEdgeResponseDto,
} from './graph-edge.dto'
export type {
  CreatePermissionProfileRequestDto,
  UpdatePermissionProfileRequestDto,
  PermissionProfileResponseDto,
} from './permission-profile.dto'
export type {
  CreateContextRuleRequestDto,
  UpdateContextRuleRequestDto,
  ContextRuleResponseDto,
} from './context-rule.dto'
