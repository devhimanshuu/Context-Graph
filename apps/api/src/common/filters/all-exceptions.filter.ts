import {
  type ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { ERROR_CODES, type ApiErrorBody, type ErrorCode } from '@contextgraph/shared'
import { AppException } from '../exceptions/app.exception'
import { getRequestId } from '../context/request-context'
import { mapPrismaError } from '../utils/prisma-error.mapper'

interface ErrorEnvelope {
  statusCode: number
  body: ApiErrorBody
}

/* The single exception boundary of the API. Order of precedence: */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<{
      status: (code: number) => { json: (body: unknown) => void }
    }>()
    const envelope = this.toEnvelope(exception)

    if (envelope.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception))
    }

    response.status(envelope.statusCode).json({
      success: false,
      error: envelope.body,
      requestId: getRequestId(),
      timestamp: new Date().toISOString(),
    })
  }

  private toEnvelope(exception: unknown): ErrorEnvelope {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.statusCode,
        body: { code: exception.code, message: exception.message, details: exception.details },
      }
    }

    if (exception instanceof ZodError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        body: {
          code: ERROR_CODES.VALIDATION,
          message: 'Validation failed',
          details: exception.issues,
        },
      }
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = mapPrismaError(exception)
      if (mapped !== null) return mapped
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus()
      const responseBody = exception.getResponse()
      const message =
        typeof responseBody === 'string'
          ? responseBody
          : String((responseBody as { message?: unknown } | null)?.message ?? exception.message)
      return { statusCode, body: { code: statusToCode(statusCode), message } }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: ERROR_CODES.INTERNAL, message: 'Internal server error' },
    }
  }
}

function statusToCode(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ERROR_CODES.VALIDATION
    case HttpStatus.UNAUTHORIZED:
      return ERROR_CODES.UNAUTHORIZED
    case HttpStatus.FORBIDDEN:
      return ERROR_CODES.FORBIDDEN
    case HttpStatus.NOT_FOUND:
      return ERROR_CODES.NOT_FOUND
    case HttpStatus.CONFLICT:
      return ERROR_CODES.CONFLICT
    case HttpStatus.TOO_MANY_REQUESTS:
      return ERROR_CODES.TOO_MANY_REQUESTS
    default:
      return ERROR_CODES.INTERNAL
  }
}
