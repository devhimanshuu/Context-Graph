/** Labels attached to a metric (e.g. route, method, status). */
export type MetricLabels = Record<string, string>

/* Metrics contract. Implementations today are no-ops; the interface isolates */
export interface IMetricsLogger {
  increment(name: string, labels?: MetricLabels, value?: number): void
  gauge(name: string, value: number, labels?: MetricLabels): void
  timing(name: string, milliseconds: number, labels?: MetricLabels): void
}

/** DI token for the metrics logger. */
export const METRICS_LOGGER = Symbol('IMetricsLogger')
