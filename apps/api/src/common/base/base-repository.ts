import type { EntityId } from '@contextgraph/types'

/* The persistence contract every repository implements. */
export abstract class BaseRepository<TEntity> {
  abstract findById(id: EntityId): Promise<TEntity | null>

  abstract findMany(): Promise<TEntity[]>

  /** Persists a new aggregate; throws on unique-violation conflicts. */
  abstract create(input: unknown): Promise<TEntity>

  abstract update(id: EntityId, input: unknown): Promise<TEntity>

  /** Marks the row deleted (soft delete); returns without throwing if absent. */
  abstract softDelete(id: EntityId): Promise<void>
}
