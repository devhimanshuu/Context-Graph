import type { PageQuery, PageResult } from '@/types'

/**
 * Generic repository contract.
 *
 * Repositories are the ONLY layer that talks to the data store. Business logic
 * (services) depends on this abstraction — never on Prisma directly — which
 * keeps the domain layer testable with fakes and swappable data stores.
 *
 * Conventions:
 * - Methods return `null` for "not found" (lookup) and throw domain errors
 *   for violations (`DuplicateRecordError`, ...) via `mapPrismaError`.
 * - `delete` removes the row; `softDelete` flips `deletedAt`. Soft delete is
 *   the default for business entities.
 * - `TEntity` is the domain model (see `src/domain/models`); `TCreateInput` /
 *   `TUpdateInput` are the validated contracts (see `src/validations`).
 *
 * Concrete repositories are added per feature, e.g.:
 *
 *   src/repositories/organizations/organization.repository.ts
 *     implements BaseRepository<Organization, string, ...>
 */
export interface BaseRepository<TEntity, TId, TCreateInput, TUpdateInput> {
  findById(id: TId): Promise<TEntity | null>

  findAll(params: PageQuery): Promise<PageResult<TEntity>>

  count(params?: PageQuery): Promise<number>

  create(input: TCreateInput): Promise<TEntity>

  update(id: TId, input: TUpdateInput): Promise<TEntity>

  /** Hard delete. Prefer `softDelete` for business entities. */
  delete(id: TId): Promise<void>

  /** Marks the row deleted via `deletedAt`; excluded from all queries. */
  softDelete(id: TId): Promise<void>
}
