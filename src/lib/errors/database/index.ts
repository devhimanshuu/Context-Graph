/**
 * Database error architecture — import from `@/lib/errors/database`.
 */
export { DatabaseError } from './database-error'
export { DatabaseConfigurationError } from './database-configuration-error'
export { DatabaseConnectionError } from './database-connection-error'
export { DuplicateRecordError } from './duplicate-record-error'
export { ForeignKeyViolationError } from './foreign-key-violation-error'
export { RecordNotFoundError } from './record-not-found-error'
export { mapPrismaError } from './prisma-error-mapper'
