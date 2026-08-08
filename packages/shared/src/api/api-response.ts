import type { ErrorCode } from "../constants/error-codes";
import type { PaginationMeta } from "../paginated";

/* Uniform HTTP envelopes. Every endpoint returns one of these two shapes; the global response */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
  requestId: string;
  timestamp: string;
}

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  /** Optional field-level validation details. */
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
  requestId: string;
  timestamp: string;
}

/** Convenience for handlers that want a strongly-typed payload. */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
