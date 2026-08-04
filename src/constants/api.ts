/**
 * API-wide constants.
 *
 * Phase 1 exposes only infrastructure endpoints (e.g. `/api/health`). These
 * constants standardize pagination, content types and versioning so that
 * business API routes added in later phases are consistent by construction.
 */
export const API = {
  /** API version used in the `/api/v1` prefix when business routes land. */
  version: 'v1',
  jsonContentType: 'application/json',
  defaultPageSize: 50,
  maxPageSize: 100,
} as const
