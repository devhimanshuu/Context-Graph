/* API-wide constants. The backend is the NestJS API (`/api/v1`, Swagger at `/docs`) — see */
export const API = {
  /** API version used in the `/api/v1` prefix when business routes land. */
  version: 'v1',
  jsonContentType: 'application/json',
  defaultPageSize: 50,
  maxPageSize: 100,
} as const
