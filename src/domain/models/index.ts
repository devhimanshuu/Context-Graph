/**
 * Domain model barrel — import from `@/domain/models`.
 *
 * These interfaces are the canonical domain contract. Prisma entities are
 * structurally compatible (or trivially mapped), so services and repositories
 * depend on this layer rather than on the ORM directly.
 */
export type { Organization } from './organization'
export type { Workspace } from './workspace'
export type { Department } from './department'
export type { User } from './user'
export type { KnowledgeNode, KnowledgeNodeComplianceTag } from './knowledge-node'
export type { GraphEdge } from './graph-edge'
export type { PermissionProfile, PermissionProfileAssignment } from './permission-profile'
export type { ContextRule } from './context-rule'
export type { AuditLog } from './audit-log'
