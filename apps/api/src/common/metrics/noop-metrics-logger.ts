import { Injectable } from '@nestjs/common'
import { type IMetricsLogger, type MetricLabels } from '../interfaces/metrics-logger.interface'

/**
 * No-op metrics sink. Satisfies the IMetricsLogger contract so interceptors
 * can be registered today; a real collector (Prometheus/Datadog) later swaps
 * this provider without touching controllers or interceptors.
 */
@Injectable()
export class NoopMetricsLogger implements IMetricsLogger {
  increment(_name: string, _labels?: MetricLabels, _value?: number): void {}
  gauge(_name: string, _value: number, _labels?: MetricLabels): void {}
  timing(_name: string, _milliseconds: number, _labels?: MetricLabels): void {}
}
