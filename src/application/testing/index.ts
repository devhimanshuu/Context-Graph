/**
 * Application testing scaffolding — import from `@/application/testing`.
 *
 * Ships the *machinery* for tests (builders, fixtures, mocks, helpers) — no
 * test cases yet. Tests land with the feature implementations (Phase 4+) and
 * the test-runner choice (vitest recommended; `createMock` is
 * framework-agnostic).
 */
export {
  buildOrganization,
  buildWorkspace,
  buildUser,
  buildKnowledgeNode,
  buildGraphEdge,
  buildContextRule,
  buildUserContext,
  buildNodeContext,
  buildCandidateNode,
  buildPermissionContext,
  buildTraversalContext,
  buildMetricsContext,
  nextId,
} from './builders'
export {
  organizationFixture,
  workspaceFixture,
  userFixture,
  editorUserContextFixture,
  adminUserContextFixture,
  viewerUserContextFixture,
  knowledgeNodeFixture,
  highImportanceFactNodeFixture,
  constraintNodeFixture,
  graphEdgeFixture,
  nodeContextFixture,
  candidateNodeFixture,
  permissionContextFixture,
  traversalContextFixture,
} from './fixtures'
export { createMock } from './mock-factory'
export {
  createMockTraversalService,
  createMockPermissionCompiler,
  createMockEntryResolver,
  createMockCandidateAssembler,
  createMockRuleEngine,
  createMockZoneInjector,
  createMockNodeFilter,
  createMockNodeClassifier,
  createMockDerivabilityEvaluator,
  createMockMetricsCollector,
  createMockCacheProvider,
  createMockEventBus,
  createMockAuditLogger,
  createMockMetricsLogger,
} from './mocks'
export { TEST_FIXED_TIME, advanceTime, fixedNow } from './test-utils'
