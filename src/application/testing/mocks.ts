import {
  type IPermissionCompiler,
  type ICandidateAssembler,
  type IDerivabilityEvaluator,
  type IEntryResolver,
  type IGraphTraversalService,
  type IMetricsCollector,
  type INodeClassifier,
  type INodeFilter,
  type IRuleEngine,
  type IZoneInjector,
} from '@/application/services/interfaces'
import { type IEventBus } from '@/application/events'
import { type ICacheProvider } from '@/application/caching'
import { type IAuditLogger, type IMetricsLogger } from '@/application/logging'
import {
  candidateNodeFixture,
  permissionContextFixture,
  traversalContextFixture,
  viewerUserContextFixture,
} from './fixtures'
import { buildMetricsContext } from './builders'
import { createMock } from './mock-factory'

/**
 * Per-interface mock factories — typed test doubles with useful defaults,
 * ready for override per test. Any method NOT supplied (by defaults or
 * overrides) throws at call time via `createMock`.
 */

export function createMockTraversalService(
  overrides: Partial<IGraphTraversalService> = {},
): IGraphTraversalService {
  return createMock<IGraphTraversalService>({
    traverse: async () => traversalContextFixture,
    ...overrides,
  })
}

export function createMockPermissionCompiler(
  overrides: Partial<IPermissionCompiler> = {},
): IPermissionCompiler {
  return createMock<IPermissionCompiler>({
    compile: async () => permissionContextFixture,
    invalidate: async () => undefined,
    ...overrides,
  })
}

export function createMockEntryResolver(overrides: Partial<IEntryResolver> = {}): IEntryResolver {
  return createMock<IEntryResolver>({
    resolve: async () => ({ entryNodeIds: ['node-a'] }),
    ...overrides,
  })
}

export function createMockCandidateAssembler(
  overrides: Partial<ICandidateAssembler> = {},
): ICandidateAssembler {
  return createMock<ICandidateAssembler>({
    assemble: async () => [candidateNodeFixture],
    ...overrides,
  })
}

export function createMockRuleEngine(overrides: Partial<IRuleEngine> = {}): IRuleEngine {
  return createMock<IRuleEngine>({
    evaluate: async () => ({ ruleId: 'rule-1', fired: false, output: null }),
    ...overrides,
  })
}

export function createMockZoneInjector(overrides: Partial<IZoneInjector> = {}): IZoneInjector {
  return createMock<IZoneInjector>({
    inject: async ({ nodes }) => ({ nodes }),
    ...overrides,
  })
}

export function createMockNodeFilter(overrides: Partial<INodeFilter> = {}): INodeFilter {
  return createMock<INodeFilter>({
    kind: 'ISOLATION',
    apply: async ({ nodes }) => nodes,
    ...overrides,
  })
}

export function createMockNodeClassifier(
  overrides: Partial<INodeClassifier> = {},
): INodeClassifier {
  return createMock<INodeClassifier>({
    classify: async ({ nodeId }) => ({ nodeId, type: 'FACT' }),
    ...overrides,
  })
}

export function createMockDerivabilityEvaluator(
  overrides: Partial<IDerivabilityEvaluator> = {},
): IDerivabilityEvaluator {
  return createMock<IDerivabilityEvaluator>({
    evaluate: async ({ node }) => ({ nodeId: node.nodeId, derivabilityScore: 0 }),
    ...overrides,
  })
}

export function createMockMetricsCollector(
  overrides: Partial<IMetricsCollector> = {},
): IMetricsCollector {
  return createMock<IMetricsCollector>({
    record: async () => undefined,
    snapshot: async () => buildMetricsContext(),
    ...overrides,
  })
}

export function createMockCacheProvider(overrides: Partial<ICacheProvider> = {}): ICacheProvider {
  return createMock<ICacheProvider>({
    get: async () => null,
    set: async () => undefined,
    delete: async () => undefined,
    has: async () => false,
    ...overrides,
  })
}

export function createMockEventBus(overrides: Partial<IEventBus> = {}): IEventBus {
  return createMock<IEventBus>({
    publish: async () => undefined,
    subscribe: () => undefined,
    ...overrides,
  })
}

export function createMockAuditLogger(overrides: Partial<IAuditLogger> = {}): IAuditLogger {
  return createMock<IAuditLogger>({
    log: async () => undefined,
    ...overrides,
  })
}

export function createMockMetricsLogger(overrides: Partial<IMetricsLogger> = {}): IMetricsLogger {
  return createMock<IMetricsLogger>({
    increment: () => undefined,
    gauge: () => undefined,
    timing: () => undefined,
    ...overrides,
  })
}

export const mockUserContext = viewerUserContextFixture
