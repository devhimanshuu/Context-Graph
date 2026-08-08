import { Injectable, type PipeTransform } from '@nestjs/common'
import { isUuid } from '../utils/uuid'
import { ValidationException } from '../exceptions/validation.exception'

/** Validates a route param is a well-formed UUID. */
@Injectable()
export class UuidParamPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isUuid(value)) {
      throw new ValidationException(`Expected a UUID, got "${value}"`)
    }
    return value
  }
}
