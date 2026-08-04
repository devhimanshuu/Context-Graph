/**
 * Error architecture — import from `@/lib/errors` instead of individual files.
 */
export { AppError } from './app-error'
export type { AppErrorOptions } from './app-error'
export { ErrorCode } from './error-codes'
export type { ErrorCode as ErrorCodeValue } from './error-codes'
export { ConflictError } from './conflict-error'
export { ForbiddenError } from './forbidden-error'
export { InternalServerError } from './internal-server-error'
export { NotFoundError } from './not-found-error'
export { UnauthorizedError } from './unauthorized-error'
export { ValidationError } from './validation-error'
export { isAppError, toAppError } from './helpers'
export {
  DatabaseError,
  DatabaseConfigurationError,
  DatabaseConnectionError,
  DuplicateRecordError,
  ForeignKeyViolationError,
  RecordNotFoundError,
  mapPrismaError,
} from './database'
