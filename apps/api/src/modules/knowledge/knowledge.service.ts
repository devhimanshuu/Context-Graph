import { Inject, Injectable } from '@nestjs/common'
import {
  NodeStatus,
  PermissionAction,
  type AuthenticatedUser,
  type EntityId,
} from '@contextgraph/types'
import { uuid } from '../../common/utils/uuid'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
import { IAuthorizationService } from '../authorization/services/authorization.service'
import { IAuthorizationEvaluator } from '../authorization/evaluator/permission-evaluator'
import { PermissionDeniedException } from '../authorization/errors/authorization-errors'
import {
  AUTHORIZATION_AUDIT_LOGGER,
  type IAuthorizationAuditLogger,
} from '../authorization/audit/authorization-audit-logger'
import type { AuthorizationDecision } from '../authorization/domain/authorization-decision'
import type { KnowledgeNodeEntity } from './knowledge.entity'
import { IKnowledgeRepository } from './knowledge.repository'
import { type KnowledgeNodeResponseDto } from './knowledge.dto'
import {
  createKnowledgeNodeInputToPrisma,
  entityToKnowledgeNodeResponse,
  knowledgeNodeToResourceContext,
  type KnowledgeNodeAuthSource,
} from './knowledge.mapper'
import type { CreateKnowledgeNodeInput, UpdateKnowledgeNodeInput } from './knowledge.validation'

export abstract class IKnowledgeService {
  /** Lists nodes the principal is authorized to read (server-side filtered). */
  abstract findByWorkspace(
    user: AuthenticatedUser,
    workspaceId: EntityId,
  ): Promise<KnowledgeNodeResponseDto[]>
  /** Returns a single node only when the principal is authorized to read it (404 otherwise). */
  abstract findById(user: AuthenticatedUser, id: EntityId): Promise<KnowledgeNodeResponseDto>
  /** Creates a node only when the principal may write it (403 + failing policy otherwise). */
  abstract create(
    user: AuthenticatedUser,
    workspaceId: EntityId,
    input: CreateKnowledgeNodeInput,
  ): Promise<KnowledgeNodeResponseDto>
  /** Updates a node only when the principal may write its resulting state (403 otherwise). */
  abstract update(
    user: AuthenticatedUser,
    id: EntityId,
    input: UpdateKnowledgeNodeInput,
  ): Promise<KnowledgeNodeResponseDto>
  abstract remove(organizationId: EntityId, id: EntityId): Promise<void>
}

@Injectable()
export class KnowledgeService implements IKnowledgeService {
  constructor(
    @Inject(IKnowledgeRepository) private readonly repository: IKnowledgeRepository,
    @Inject(IAuthorizationService) private readonly authorization: IAuthorizationService,
    @Inject(IAuthorizationEvaluator) private readonly evaluator: IAuthorizationEvaluator,
    @Inject(AUTHORIZATION_AUDIT_LOGGER)
    private readonly audit: IAuthorizationAuditLogger,
  ) {}

  async findByWorkspace(
    user: AuthenticatedUser,
    workspaceId: EntityId,
  ): Promise<KnowledgeNodeResponseDto[]> {
    const nodes = await this.repository.findByWorkspace(user.organizationId, workspaceId)
    if (nodes.length === 0) return []

    // One compilation (cached) reused for every node — authorization is
    // in-memory from here on: zero database queries per node.
    const context = await this.authorization.getContext(user)
    const authorized: KnowledgeNodeEntity[] = []
    const denials: { node: KnowledgeNodeEntity; decision: AuthorizationDecision }[] = []
    for (const node of nodes) {
      const decision = this.evaluator.evaluate(
        context,
        knowledgeNodeToResourceContext(node),
        PermissionAction.READ,
      )
      if (decision.allowed) authorized.push(node)
      else denials.push({ node, decision })
    }
    // Every withheld node is a denied read attempt — record actor, node id and
    // the failing policy so access decisions are explainable and auditable.
    if (denials.length > 0) {
      await this.recordDenials(user, denials)
    }
    return authorized.map((node) => entityToKnowledgeNodeResponse(node))
  }

  async findById(user: AuthenticatedUser, id: EntityId): Promise<KnowledgeNodeResponseDto> {
    const node = await this.ensureExists(id, user.organizationId)
    const context = await this.authorization.getContext(user)
    const decision = this.evaluator.evaluate(
      context,
      knowledgeNodeToResourceContext(node),
      PermissionAction.READ,
    )
    // An unauthorized node looks identical to a missing one (no existence leak),
    // but the attempt is still recorded for the audit trail.
    if (!decision.allowed) {
      await this.recordDenials(user, [{ node, decision }])
      throw new NotFoundException('Knowledge node not found')
    }
    return entityToKnowledgeNodeResponse(node)
  }

  async create(
    user: AuthenticatedUser,
    workspaceId: EntityId,
    input: CreateKnowledgeNodeInput,
  ): Promise<KnowledgeNodeResponseDto> {
    const decision = await this.authorization.evaluateResource(
      user,
      knowledgeNodeToResourceContext({
        id: uuid(),
        organizationId: user.organizationId,
        workspaceId,
        departmentId: input.departmentId ?? null,
        createdById: user.id,
        complianceTags: input.complianceTags ?? [],
        metadata: input.metadata ?? {},
        status: input.status ?? NodeStatus.DRAFT,
        type: input.type,
      }),
      PermissionAction.WRITE,
    )
    this.assertAllowed(decision, 'knowledge-node')

    const node = await this.repository.create(
      createKnowledgeNodeInputToPrisma(input, user.organizationId, workspaceId, user.id),
    )
    return entityToKnowledgeNodeResponse(node)
  }

  async update(
    user: AuthenticatedUser,
    id: EntityId,
    input: UpdateKnowledgeNodeInput,
  ): Promise<KnowledgeNodeResponseDto> {
    const node = await this.ensureExists(id, user.organizationId)
    // The resulting state decides: fields not provided keep their current value,
    // so moving a node into an inaccessible department or adding a tag without
    // clearance is rejected before persist.
    const decision = await this.authorization.evaluateResource(
      user,
      knowledgeNodeToResourceContext(this.merge(node, input)),
      PermissionAction.WRITE,
    )
    this.assertAllowed(decision, 'knowledge-node')

    const updated = await this.repository.update(id, input)
    return entityToKnowledgeNodeResponse(updated)
  }

  async remove(organizationId: EntityId, id: EntityId): Promise<void> {
    await this.ensureExists(id, organizationId)
    await this.repository.softDelete(id)
  }

  /** Fails with 404 when the node is missing OR belongs to another tenant. */
  private async ensureExists(id: EntityId, organizationId: EntityId) {
    const node = await this.repository.findById(id)
    if (node === null || node.organizationId !== organizationId) {
      throw new NotFoundException('Knowledge node not found')
    }
    return node
  }

  /** Maps a write denial to a 403 carrying the failing policy. */
  private assertAllowed(decision: AuthorizationDecision, resourceType: string): void {
    if (!decision.allowed) {
      throw new PermissionDeniedException('Insufficient permission to write this node', {
        reason: decision.reason,
        failedPolicy: decision.failedPolicy,
        resourceType,
      })
    }
  }

  /** Writes one audit entry per denied read attempt (actor, node id, failing policy). */
  private async recordDenials(
    user: AuthenticatedUser,
    denials: readonly { node: KnowledgeNodeEntity; decision: AuthorizationDecision }[],
  ): Promise<void> {
    await Promise.all(
      denials.map(({ node, decision }) =>
        this.audit.recordDenial({
          organizationId: user.organizationId,
          actorId: user.id,
          resourceType: 'knowledge-node',
          resourceId: node.id,
          reason: decision.reason,
          failedPolicy: decision.failedPolicy,
        }),
      ),
    )
  }

  /** Prospective state of an update: input over current values. */
  private merge(
    node: KnowledgeNodeAuthSource,
    input: UpdateKnowledgeNodeInput,
  ): KnowledgeNodeAuthSource {
    return {
      id: node.id,
      organizationId: node.organizationId,
      workspaceId: node.workspaceId,
      departmentId: input.departmentId ?? node.departmentId,
      createdById: node.createdById,
      complianceTags: input.complianceTags ?? node.complianceTags,
      metadata: input.metadata ?? node.metadata,
      status: input.status ?? node.status,
      type: input.type ?? node.type,
    }
  }
}
