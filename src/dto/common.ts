import type { SoftDeletableEntity } from '@/domain/base'

/**
 * Shared DTO contracts.
 *
 * Separation rule:
 * - Request DTOs derive from Zod schemas (`src/validations/**`) — the API's
 *   input contract.
 * - Response DTOs derive from domain models (`src/domain/models/**`) — the
 *   API's output contract. Serializers (Phase 3+) map domain → response.
 */

/**
 * Response DTO for any entity: the full domain shape minus store-internal
 * soft-delete flags, which clients must never see or reason about.
 */
export type PublicEntity<T extends SoftDeletableEntity> = Omit<T, 'deletedAt'>
