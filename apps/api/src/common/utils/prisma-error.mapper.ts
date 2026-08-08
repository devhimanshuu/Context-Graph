import { type Prisma } from '@prisma/client'
import { ERROR_CODES, type ApiErrorBody } from '@contextgraph/shared'

export interface MappedError {
  statusCode: number
  body: ApiErrorBody
}

/* Translates the most common Prisma known-request errors into uniform API */
export function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): MappedError | null {
  const meta = error.meta as Record<string, unknown> | undefined

  switch (error.code) {
    case 'P2002':
      return {
        statusCode: 409,
        body: {
          code: ERROR_CODES.UNIQUE_VIOLATION,
          message: 'A record with the same unique value already exists',
          details: { target: meta?.target },
        },
      }
    case 'P2003':
      return {
        statusCode: 409,
        body: {
          code: ERROR_CODES.FOREIGN_KEY_VIOLATION,
          message: 'Operation violates a foreign key constraint',
          details: { constraint: meta?.constraint ?? meta?.field_name },
        },
      }
    case 'P2025':
      return {
        statusCode: 404,
        body: {
          code: ERROR_CODES.RECORD_NOT_FOUND,
          message: 'Record not found',
        },
      }
    case 'P1001':
    case 'P1002':
      return {
        statusCode: 503,
        body: {
          code: ERROR_CODES.DATABASE_CONNECTION,
          message: 'Database connection failed',
        },
      }
    default:
      return null
  }
}
