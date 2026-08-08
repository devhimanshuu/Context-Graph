import { Injectable, type PipeTransform } from '@nestjs/common'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type PaginationParams } from '@contextgraph/shared'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/* Normalizes `?page=&limit=` into a bounded PaginationParams. Silently */
@Injectable()
export class PaginationPipe implements PipeTransform<unknown, PaginationParams> {
  transform(value: unknown): PaginationParams {
    const raw = (value ?? {}) as Record<string, unknown>
    const page = clamp(toPositiveInt(raw.page, 1), 1, Number.MAX_SAFE_INTEGER)
    const limit = clamp(toPositiveInt(raw.limit, DEFAULT_PAGE_SIZE), 1, MAX_PAGE_SIZE)
    return { page, limit }
  }
}
