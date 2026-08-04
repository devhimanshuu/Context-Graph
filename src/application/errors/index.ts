/**
 * Application-layer error family — import from `@/application/errors`.
 *
 * All application errors extend `BaseApplicationError` (which extends the
 * shared `AppError`), so the HTTP boundary and the logging system treat them
 * uniformly. `ValidationError` is deliberately NOT re-declared here: the
 * shared validation error from `@/lib/errors` is the single source of truth.
 */
export { BaseApplicationError } from './base-application-error'
export { PipelineError } from './pipeline-error'
export { TraversalError } from './traversal-error'
export { PermissionError } from './permission-error'
export { RuleEngineError } from './rule-engine-error'
export { CandidateError } from './candidate-error'
export { ConfigurationError } from './configuration-error'
export { ValidationError } from '@/lib/errors/validation-error'
