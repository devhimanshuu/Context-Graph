import { ERROR_CODES } from '@contextgraph/shared'
import { AppException } from '../../../common/exceptions/app.exception'

/** Authorization denied — the fail-closed outcome of a policy evaluation. */
export class PermissionDeniedException extends AppException {
  readonly code = ERROR_CODES.PERMISSION_DENIED
  readonly statusCode = 403

  constructor(
    message: string,
    details?: {
      reason?: string
      failedPolicy?: string | null
      resourceType?: string
      resourceId?: string
    },
  ) {
    super(message, details)
  }
}

/** The principal's authorization state could not be compiled from server data. */
export class AuthorizationCompileException extends AppException {
  readonly code = ERROR_CODES.AUTHORIZATION_COMPILE
  readonly statusCode = 500

  constructor(message: string, details?: unknown) {
    super(message, details)
  }
}

/** No authenticated principal is available to authorize the operation. */
export class AuthorizationContextMissingException extends AppException {
  readonly code = ERROR_CODES.AUTHORIZATION_CONTEXT_MISSING
  readonly statusCode = 401

  constructor(message = 'No authenticated user for authorization') {
    super(message)
  }
}
