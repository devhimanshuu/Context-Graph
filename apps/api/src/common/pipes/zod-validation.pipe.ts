import { Injectable, type PipeTransform } from '@nestjs/common'
import { type z } from 'zod'
import { ValidationException } from '../exceptions/validation.exception'

/* Validates a value against a Zod schema. Use per-parameter: */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new ValidationException('Request validation failed', result.error.issues)
    }
    return result.data
  }
}
