/**
 * Repositories barrel — import from `@/repositories`.
 *
 * Phase 2 ships the contracts (interfaces) only; implementations land with
 * the business features and are exported here as they arrive, e.g.:
 *   export { organizationRepository } from "./organizations/organization.repository";
 */
export type { BaseRepository } from './base'
export type { OrganizationRepository } from './organizations/organization.repository'
export type { WorkspaceRepository } from './workspaces/workspace.repository'
export type { DepartmentRepository } from './departments/department.repository'
export type { UserRepository } from './users/user.repository'
export type { KnowledgeNodeRepository } from './knowledge-nodes/knowledge-node.repository'
export type { GraphEdgeRepository } from './graph-edges/graph-edge.repository'
export type { PermissionProfileRepository } from './permission-profiles/permission-profile.repository'
export type { ContextRuleRepository } from './context-rules/context-rule.repository'
export type { AuditLogRepository, CreateAuditLogInput } from './audit-logs/audit-log.repository'
export type { PageQuery, PageResult } from '@/types'
