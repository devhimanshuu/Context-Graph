/**
 * Application layer (Phase 3) — import from `@/application`.
 *
 * The application layer is the blueprint every future business module plugs
 * into: service contracts, use-case contracts, pipeline contracts, DTOs,
 * events, caching, configuration, logging and DI. It contains ZERO business
 * logic — only contracts, orchestration vocabulary and the DI machinery.
 *
 * Public surfaces (prefer importing the narrow barrel when possible):
 * - `@/application/services/interfaces` — replaceable service contracts
 * - `@/application/use-cases` — use-case contracts (I/O DTOs, deps, factories)
 * - `@/application/contracts` — pipeline contracts
 * - `@/application/dto` — context and IO DTOs
 * - `@/application/errors` — application error family
 * - `@/application/events` — event contracts
 * - `@/application/caching` — cache contracts
 * - `@/application/config` — typed configuration
 * - `@/application/logging` — logger contracts
 * - `@/application/di` — container + provider registry
 * - `@/application/testing` — builders, fixtures, mocks, test helpers
 */
export type * from './contracts'
export type * from './dto'
export type * from './errors'
export * from './di'
export type * from './events'
export type * from './config'
export type * from './caching'
export type * from './logging'
export type * from './mappers'
export type * from './services/interfaces'
export type * from './use-cases'
export type * from './pipelines'
export type * from './shared'
