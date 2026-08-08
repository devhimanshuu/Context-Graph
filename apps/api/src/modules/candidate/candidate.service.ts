import { Inject, Injectable } from '@nestjs/common'
import { type ILogger, LOGGER } from '../../common/interfaces/logger.interface'
import type { BuildCandidateSetInput, BuildCandidateSetResult } from './candidate.contracts'

export abstract class ICandidateBuilder {
  abstract build(input: BuildCandidateSetInput): Promise<BuildCandidateSetResult>
}

/* Candidate builder scaffold. The ranking/compression algorithm (using */
@Injectable()
export class CandidateBuilder implements ICandidateBuilder {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  async build(_input: BuildCandidateSetInput): Promise<BuildCandidateSetResult> {
    this.logger.debug('Candidate build requested (engine pending)')
    return { candidates: [], truncated: false }
  }
}
