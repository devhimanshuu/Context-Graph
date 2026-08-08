import { Module } from '@nestjs/common'
import { ICandidateBuilder, CandidateBuilder } from './candidate.service'

/* Candidate module — assembles and ranks candidate nodes for context */
@Module({
  providers: [{ provide: ICandidateBuilder, useClass: CandidateBuilder }],
  exports: [ICandidateBuilder],
})
export class CandidateModule {}
