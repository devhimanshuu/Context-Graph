/* API surface constants. The NestJS bootstrap reads these so route prefixes, */
export const API_GLOBAL_PREFIX = "api";
export const API_VERSION = "1";
export const API_DEFAULT_VERSION = "1";

/** Fully-qualified prefix for versioned routes: `api/v1`. */
export const API_PREFIX = `${API_GLOBAL_PREFIX}/v${API_DEFAULT_VERSION}`;

/** Where Swagger UI is served. */
export const SWAGGER_PATH = "docs";

/** Request header names honored by middleware/guards. */
export const HEADERS = {
  /** Correlation id propagated across services (OpenTelemetry ready). */
  CORRELATION_ID: "x-correlation-id",
  /** Request id assigned by this API and echoed in responses. */
  REQUEST_ID: "x-request-id",
  /** Optional tenant hint for org-scoped routes (replaced by JWT org claim). */
  ORGANIZATION: "x-organization-id",
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
