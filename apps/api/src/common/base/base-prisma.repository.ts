import type { EntityId } from '@contextgraph/types'
import { BaseRepository } from './base-repository'

/* Minimal structural contract for a Prisma model delegate. */
export interface PrismaDelegate {
  findUnique(args: Record<string, unknown>): Promise<unknown | null>
  findFirst(args?: Record<string, unknown>): Promise<unknown | null>
  findMany(args?: Record<string, unknown>): Promise<unknown[]>
  count(args?: Record<string, unknown>): Promise<number>
  create(args: Record<string, unknown>): Promise<unknown>
  update(args: Record<string, unknown>): Promise<unknown>
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>
}

/* Generic CRUD implementation over any Prisma delegate. */
export abstract class BasePrismaRepository<TEntity> extends BaseRepository<TEntity> {
  protected constructor(protected readonly delegate: PrismaDelegate) {
    super()
  }

  override async findById(id: EntityId): Promise<TEntity | null> {
    // Every mutable model has a `deletedAt` column; excluding soft-deleted rows here closes the leak
    // for ALL repositories (services that call findById for ensureExists, the JWT strategy, …). `findFi...
    const row = await this.delegate.findFirst({ where: { id, deletedAt: null } })
    return row === null ? null : this.toEntity(row)
  }

  override async findMany(): Promise<TEntity[]> {
    const rows = await this.delegate.findMany({ where: { deletedAt: null } })
    return rows.map((row) => this.toEntity(row))
  }

  override async create(input: unknown): Promise<TEntity> {
    const row = await this.delegate.create({ data: input })
    return this.toEntity(row)
  }

  override async update(id: EntityId, input: unknown): Promise<TEntity> {
    const row = await this.delegate.update({ where: { id }, data: input })
    return this.toEntity(row)
  }

  override async softDelete(id: EntityId): Promise<void> {
    await this.delegate.updateMany({
      where: { id },
      data: { deletedAt: new Date().toISOString() },
    })
  }

  /** Maps a raw Prisma row to the domain entity (the only boundary). */
  protected abstract toEntity(row: unknown): TEntity
}
