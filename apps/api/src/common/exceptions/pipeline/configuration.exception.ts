import { ERROR_CODES } from '@contextgraph/shared'
import { PipelineException } from './pipeline.exception'

export class ConfigurationException extends PipelineException {
  override readonly code = ERROR_CODES.CONFIGURATION

  constructor(message = 'Engine configuration is invalid', details?: unknown) {
    super(message, details)
  }
}
