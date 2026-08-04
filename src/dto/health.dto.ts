/**
 * DTO returned by the health check endpoint (`GET /api/health`).
 *
 * This is infrastructure, not business logic: it exists so deployments and
 * load balancers can verify the process is alive, and it exercises the full
 * request pipeline (route handler → controller → service → response DTO).
 */
export interface HealthStatusDto {
  status: 'ok'
  service: string
  version: string
  timestamp: string
  uptimeSeconds: number
}
