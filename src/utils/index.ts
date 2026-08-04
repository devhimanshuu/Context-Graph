/**
 * Utilities barrel — import from `@/utils`.
 *
 * Utilities are pure, framework-agnostic helpers. They must never import from
 * `@/services`, `@/repositories` or `@/features`.
 */
export { ok, created, noContent, errorEnvelope } from './api-response'
export type { ResponseOptions } from './api-response'
export { getBreadcrumbItems } from './breadcrumbs'
export type { BreadcrumbItem } from './breadcrumbs'
export { createRequestId } from './request-id'
